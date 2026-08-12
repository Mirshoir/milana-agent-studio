import { getDb } from "@/db";
import { ensureStudioSchema } from "@/db/raw";
import { promptAnalyses } from "@/db/schema";

function analyzePrompt(text: string) {
  const checks = [
    { name: "Mission", pass: /mission|purpose|objective|vazifa|цель/i.test(text), weight: 15 },
    { name: "Grounding", pass: /verified|source|ground|tasdiq|провер/i.test(text), weight: 20 },
    { name: "Language continuity", pass: /language|til|язык/i.test(text), weight: 15 },
    { name: "Tool boundaries", pass: /tool|permission|allowed|ruxsat|инструмент/i.test(text), weight: 15 },
    { name: "Escalation", pass: /escalat|handoff|manager|менеджер|inson/i.test(text), weight: 15 },
    { name: "Success criteria", pass: /success|expected|output|natija|результат/i.test(text), weight: 10 },
    { name: "Anti-hallucination", pass: /never invent|do not invent|hallucinat|to'qima|не выдум/i.test(text), weight: 10 },
  ];
  const score = checks.reduce((sum, check) => sum + (check.pass ? check.weight : 0), 0);
  const risks: string[] = [];
  if (text.length < 280) risks.push("Prompt may be too short to define ownership and failure behavior.");
  if (text.length > 12000) risks.push("Prompt is long enough to create instruction competition and latency.");
  if (/always.{0,30}(discount|price|promise)|guarantee delivery/i.test(text)) risks.push("Potential unsafe commercial promise detected.");
  if (!/uncertain|confidence|clarif|aniq|уточн/i.test(text)) risks.push("No explicit uncertainty or clarification policy found.");
  return { score, checks, risks, characters: text.length, words: text.trim().split(/\s+/).filter(Boolean).length, tokenEstimate: Math.ceil(text.length / 4), recommendation: score >= 85 ? "Ready for evaluation" : score >= 65 ? "Strengthen missing controls before evaluation" : "Requires prompt redesign" };
}

export async function POST(request: Request) {
  try {
    await ensureStudioSchema();
    const body = await request.json() as { agentId?: string; text?: string; sourceType?: string; sourceId?: string };
    const text = body.text?.trim() || "";
    if (!text) return Response.json({ error: "Prompt text is required." }, { status: 400 });
    if (text.length > 50000) return Response.json({ error: "Prompt analysis is limited to 50,000 characters." }, { status: 413 });
    const analysis = analyzePrompt(text);
    const row = { id: `analysis_${crypto.randomUUID()}`, agentId: body.agentId || "unassigned", sourceType: body.sourceType || "prompt", sourceId: body.sourceId || null, score: analysis.score, analysisJson: JSON.stringify(analysis), createdAt: new Date().toISOString() };
    await getDb().insert(promptAnalyses).values(row);
    return Response.json({ analysis, id: row.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Prompt analysis failed" }, { status: 500 });
  }
}
