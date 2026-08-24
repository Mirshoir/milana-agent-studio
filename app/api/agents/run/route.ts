import { env } from "cloudflare:workers";
import { ensureStudioSchema, getD1 } from "@/db/raw";

type AgentModelRoute = {
  provider: "openai" | "google";
  providerLabel: "OpenAI" | "Google Gemini";
  model: string;
  capability: "text" | "research" | "image" | "reasoning";
};

type RunnableAgent = {
  id: string;
  name: string;
  role: string;
  purpose: string;
  guardrails: string[];
  inputs: string[];
  outputs: string[];
  model?: AgentModelRoute;
};

type StoredTeam = { name: string; objective: string; agents: RunnableAgent[] };

function outputText(payload: { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }) {
  return (payload.output || [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text)
    .join("\n\n")
    .trim();
}

async function runOpenAI(agent: RunnableAgent, team: StoredTeam, input: string, runtime: Record<string, string | undefined>) {
  const apiKey = runtime.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not connected. Add OPENAI_API_KEY to enable live text, research, and reasoning runs.");
  const model = runtime.OPENAI_MODEL || agent.model?.model || "gpt-5";
  const tools = agent.model?.capability === "research" ? [{ type: "web_search", search_context_size: "medium" }] : undefined;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      ...(tools ? { tools } : {}),
      input: [
        { role: "developer", content: [{ type: "input_text", text: `You are ${agent.name}, the ${agent.role} inside ${team.name}.\n\nTeam objective: ${team.objective}\nYour responsibility: ${agent.purpose}\nExpected inputs: ${agent.inputs.join(", ")}\nExpected outputs: ${agent.outputs.join(", ")}\nGuardrails:\n- ${agent.guardrails.join("\n- ")}\n\nStay inside your assigned responsibility. Return a concise work product, state assumptions, and separate facts from recommendations.` }] },
        { role: "user", content: [{ type: "input_text", text: input }] },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI run failed (${response.status}). Check the configured key and model.`);
  const payload = await response.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  const text = outputText(payload);
  if (!text) throw new Error("OpenAI returned no usable text output.");
  return Response.json({ kind: "text", text, provider: "OpenAI", model });
}

async function runGeminiImage(agent: RunnableAgent, team: StoredTeam, input: string, runtime: Record<string, string | undefined>) {
  const apiKey = runtime.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Google Gemini is not connected. Add GEMINI_API_KEY to enable live image generation.");
  const model = runtime.GEMINI_IMAGE_MODEL || agent.model?.model || "gemini-2.5-flash-image";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `You are ${agent.name}, the image specialist inside ${team.name}. Team objective: ${team.objective}. Create one polished campaign image from this approved request: ${input}. Follow the brief exactly, avoid invented logos or claims, and keep any visible text minimal and legible.` }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  if (!response.ok) throw new Error(`Gemini image run failed (${response.status}). Check the configured key and image model.`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }> } }> };
  const parts = payload.candidates?.[0]?.content?.parts || [];
  const image = parts.find((part) => part.inlineData?.data)?.inlineData;
  if (!image?.data) throw new Error("Gemini returned no usable image output.");
  return Response.json({ kind: "image", data: image.data, mimeType: image.mimeType || "image/png", text: parts.map((part) => part.text).filter(Boolean).join("\n"), provider: "Google Gemini", model });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { teamId?: string; agentId?: string; input?: string };
    const teamId = body.teamId?.trim() || "";
    const agentId = body.agentId?.trim() || "";
    const input = body.input?.trim() || "";
    if (!teamId || !agentId || input.length < 3) return Response.json({ error: "Choose an agent and provide a task." }, { status: 400 });
    if (input.length > 12000) return Response.json({ error: "Agent tasks are limited to 12,000 characters." }, { status: 413 });

    await ensureStudioSchema();
    const row = await getD1().prepare("SELECT config_json FROM agent_teams WHERE id = ? AND owner_id = ? LIMIT 1").bind(teamId, "workspace").first<{ config_json: string }>();
    if (!row?.config_json) return Response.json({ error: "Save or install this team before running an agent." }, { status: 404 });
    const team = JSON.parse(row.config_json) as StoredTeam;
    const agent = team.agents.find((item) => item.id === agentId);
    if (!agent) return Response.json({ error: "This agent is no longer part of the saved team." }, { status: 404 });
    const runtime = env as unknown as Record<string, string | undefined>;
    if (agent.model?.provider === "google" && agent.model.capability === "image") return await runGeminiImage(agent, team, input, runtime);
    return await runOpenAI(agent, team, input, runtime);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The agent run failed.";
    const status = /not connected/i.test(message) ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
