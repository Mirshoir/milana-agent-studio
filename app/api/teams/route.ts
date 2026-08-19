import { env } from "cloudflare:workers";
import { ensureStudioSchema, getD1 } from "@/db/raw";

type TeamAgent = {
  id: string;
  name: string;
  role: string;
  purpose: string;
  icon: string;
  accent: string;
  tools: string[];
  inputs: string[];
  outputs: string[];
  guardrails: string[];
};

type TeamEdge = { id: string; from: string; to: string; label: string; condition: string; payload: string[] };
type TeamResearch = {
  mode: "live-ai" | "site-evidence" | "domain-blueprint" | "manual";
  summary: string;
  findings: Array<{ title: string; detail: string; confidence: "high" | "medium" | "assumption" }>;
  sources: Array<{ title: string; url: string }>;
  gaps: string[];
  completedAt: string;
};
type AgentTeam = {
  id: string;
  name: string;
  description: string;
  objective: string;
  status: "draft" | "published";
  creationMode: "prompt" | "manual";
  agents: TeamAgent[];
  edges: TeamEdge[];
  sharedKnowledge: string[];
  channels: string[];
  triggers: string[];
  successMetrics: string[];
  research: TeamResearch;
  updatedAt: string;
};

type StoredTeamRow = { id: string; status: string; config_json: string; research_json: string; updated_at: string };

const accents = ["violet", "sky", "pink", "orange", "emerald", "indigo", "gold", "lime"];

const teamPatterns = [
  {
    test: /marketing|content|campaign|brand|social|seo|growth/i,
    name: "Marketing Growth Team",
    description: "An evidence-led marketing team that turns audience insight into coordinated campaigns and measurable learning.",
    roles: [
      ["Growth Lead", "Orchestrates priorities, briefs, approvals, and learning loops", ["Workspace memory", "Analytics"], ["Business objective", "Performance signals"], ["Approved campaign brief", "Priority decision"]],
      ["Audience Researcher", "Studies customers, competitors, language, and market shifts before strategy is set", ["Web research", "Knowledge base"], ["Research question", "Known customer evidence"], ["Evidence brief", "Audience segments"]],
      ["Content Strategist", "Turns research into channel strategy, messaging pillars, and an editorial plan", ["Knowledge base", "Planning board"], ["Evidence brief", "Brand rules"], ["Content strategy", "Editorial backlog"]],
      ["Creative Producer", "Creates campaign concepts and channel-ready content from approved briefs", ["Image studio", "Content workspace"], ["Approved brief", "Brand examples"], ["Creative package", "Copy variants"]],
      ["Distribution Manager", "Schedules approved assets and adapts them to each connected channel", ["Social scheduler", "Email"], ["Approved creative", "Channel calendar"], ["Publication receipts", "Distribution log"]],
      ["Performance Analyst", "Measures results, detects anomalies, and feeds actionable learning back to the team", ["Data analysis", "Analytics"], ["Campaign results", "Success metrics"], ["Performance report", "Optimization recommendations"]],
    ],
    metrics: ["Qualified pipeline influenced", "Cost per qualified action", "Content-to-conversion rate", "Learning velocity per campaign"],
  },
  {
    test: /sales|revenue|lead|prospect|pipeline/i,
    name: "Revenue Team",
    description: "A coordinated revenue team that researches accounts, qualifies intent, personalizes outreach, and protects handoffs.",
    roles: [
      ["Revenue Orchestrator", "Owns account state, routing, approvals, and the next best action", ["CRM", "Workspace memory"], ["Inbound event", "Account state"], ["Assigned task", "Pipeline update"]],
      ["Account Researcher", "Builds verified account and stakeholder context", ["Web research", "CRM"], ["Account name", "Research question"], ["Account brief", "Evidence links"]],
      ["Qualification Agent", "Scores need, timing, authority, and fit without inventing facts", ["CRM", "Knowledge base"], ["Conversation", "Account brief"], ["Qualification record", "Open questions"]],
      ["Outreach Writer", "Creates relevant, approved outreach from verified evidence", ["Email", "Knowledge base"], ["Qualification record", "Brand voice"], ["Outreach draft", "Personalization rationale"]],
      ["Meeting Coordinator", "Books meetings only after consent and preserves context for the human owner", ["Calendar", "Email"], ["Approved handoff", "Availability"], ["Booking receipt", "Meeting brief"]],
    ],
    metrics: ["Qualified opportunity rate", "Research-to-reply rate", "Time to human handoff", "Meeting show rate"],
  },
  {
    test: /support|service|customer success|help desk/i,
    name: "Customer Experience Team",
    description: "A service team that researches the full context, resolves grounded questions, and hands off safely.",
    roles: [
      ["Support Orchestrator", "Owns the case, customer state, routing, and final response", ["Help desk", "Workspace memory"], ["Customer message", "Case history"], ["Resolution plan", "Case status"]],
      ["Context Researcher", "Finds relevant history, policies, products, and prior resolutions", ["Knowledge base", "Order system"], ["Case context", "Customer identifiers"], ["Evidence packet", "Missing context"]],
      ["Resolution Specialist", "Drafts the most accurate resolution using approved evidence", ["Knowledge base", "Help desk"], ["Evidence packet", "Customer intent"], ["Grounded answer", "Proposed action"]],
      ["Quality Guard", "Checks language, policy, privacy, and unsupported action claims", ["Policy engine", "Workspace memory"], ["Draft answer", "Policy rules"], ["Approval result", "Required corrections"]],
      ["Human Handoff", "Routes sensitive or unresolved cases with a complete brief", ["Help desk", "Notifications"], ["Escalation reason", "Case packet"], ["Owner receipt", "Handoff summary"]],
    ],
    metrics: ["Grounded resolution rate", "First-contact resolution", "Repeat-contact rate", "Handoff completeness"],
  },
];

const defaultPattern = {
  name: "Operations Team",
  description: "A coordinated AI team that researches context, plans work, executes through approved tools, and verifies outcomes.",
  roles: [
    ["Team Orchestrator", "Owns the objective, delegates work, and combines verified results", ["Workspace memory", "Task board"], ["User objective", "Team state"], ["Work plan", "Final outcome"]],
    ["Research Agent", "Collects evidence and identifies missing context before execution", ["Web research", "Knowledge base"], ["Research question", "Known context"], ["Evidence brief", "Open questions"]],
    ["Planning Agent", "Converts evidence into steps, dependencies, and acceptance criteria", ["Planning board", "Workspace memory"], ["Evidence brief", "Objective"], ["Execution plan", "Risk register"]],
    ["Execution Agent", "Completes approved work through connected tools", ["Tool gateway", "Knowledge base"], ["Approved task", "Constraints"], ["Work product", "Action receipts"]],
    ["Quality Agent", "Checks evidence, constraints, safety, and completion criteria", ["Policy engine", "Workspace memory"], ["Work product", "Acceptance criteria"], ["Verification result", "Corrections"]],
  ],
  metrics: ["Verified completion rate", "Human correction rate", "Time to outcome", "Handoff success rate"],
};

function titleCase(value: string) {
  return value.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/).slice(0, 6).map((word) => `${word[0]?.toUpperCase() || ""}${word.slice(1).toLowerCase()}`).join(" ");
}

function manualAgent(role: string, index: number): TeamAgent {
  const cleanRole = role.trim() || `Specialist ${index + 1}`;
  return { id: `member_${crypto.randomUUID()}`, name: cleanRole.replace(/Agent$/i, "").trim(), role: cleanRole, purpose: `Own the ${cleanRole.toLowerCase()} responsibilities and return a verified result to the team.`, icon: cleanRole[0]?.toUpperCase() || "A", accent: accents[index % accents.length], tools: ["Workspace memory"], inputs: ["Assigned task", "Team context"], outputs: ["Verified result", "Open questions"], guardrails: ["Do not act outside the assigned responsibility", "Return evidence and uncertainty with every handoff"] };
}

function fallbackTeam(prompt: string, research: TeamResearch, creationMode: "prompt" | "manual" = "prompt", manualRoles?: string[], manualName?: string): AgentTeam {
  const pattern = teamPatterns.find((item) => item.test.test(prompt)) || defaultPattern;
  const roles = manualRoles?.length ? manualRoles.map((role, index) => manualAgent(role, index)) : pattern.roles.map((role, index) => ({ id: `member_${crypto.randomUUID()}`, name: String(role[0]).replace(/ Agent$/i, ""), role: String(role[0]), purpose: String(role[1]), icon: String(role[0])[0], accent: accents[index % accents.length], tools: role[2] as string[], inputs: role[3] as string[], outputs: role[4] as string[], guardrails: ["Use only verified evidence and approved tools", "Include provenance and uncertainty in every handoff"] }));
  const edges = roles.slice(1).map((agent, index) => ({ id: `edge_${crypto.randomUUID()}`, from: roles[index].id, to: agent.id, label: index === 0 ? "research brief" : "approved handoff", condition: "Required inputs are present and the previous step is verified", payload: roles[index].outputs.slice(0, 2) }));
  if (roles.length > 2) edges.push({ id: `edge_${crypto.randomUUID()}`, from: roles[roles.length - 1].id, to: roles[0].id, label: "learning loop", condition: "A result, exception, or performance signal is available", payload: roles[roles.length - 1].outputs.slice(0, 2) });
  const name = manualName?.trim() || pattern.name;
  const updatedAt = new Date().toISOString();
  return { id: `team_${crypto.randomUUID()}`, name, description: pattern.description, objective: prompt.trim(), status: "draft", creationMode, agents: roles, edges, sharedKnowledge: ["Company and product context", "Approved policies and brand rules", "Customer and audience evidence", "Team handoff contract"], channels: /instagram|social/i.test(prompt) ? ["Workspace", "Instagram", "Analytics"] : /email/i.test(prompt) ? ["Workspace", "Email", "Analytics"] : ["Workspace", "Knowledge base"], triggers: ["New objective from a user", "New evidence or performance signal", "Scheduled review"], successMetrics: pattern.metrics, research, updatedAt };
}

function safePublicUrl(value: string) {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || /^(127|10|0)\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === "::1") return null;
    url.hash = "";
    return url;
  } catch { return null; }
}

function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim().slice(0, 30000);
}

async function siteResearch(prompt: string, website: string): Promise<TeamResearch | null> {
  const seed = safePublicUrl(website);
  if (!seed) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(seed, { headers: { "user-agent": "AgentMarketResearch/1.0", accept: "text/html" }, redirect: "follow", signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return null;
    const html = (await response.text()).slice(0, 500000);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim() || seed.hostname;
    const description = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)/i)?.[1] || "";
    const text = stripHtml(html);
    const headings = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)).slice(0, 8).map((match) => stripHtml(match[1])).filter(Boolean);
    return { mode: "site-evidence", summary: `Reviewed ${title} to ground the team in the company’s public positioning, language, and visible offer before designing roles and handoffs.`, findings: [
      { title: "Public positioning", detail: description || text.slice(0, 320), confidence: "high" },
      { title: "Visible priorities", detail: headings.length ? headings.join(" · ") : "The public page was readable but had limited structured headings.", confidence: headings.length ? "high" : "medium" },
      { title: "Requested outcome", detail: prompt, confidence: "high" },
      { title: "Operating implication", detail: "The team should share one evidence base, require explicit handoff payloads, and route every external action through approval-aware tools.", confidence: "medium" },
    ], sources: [{ title, url: seed.toString() }], gaps: ["Internal customer data and performance history were not available", "Final channel permissions require owner review"], completedAt: new Date().toISOString() };
  } catch { return null; }
}

function domainResearch(prompt: string): TeamResearch {
  const pattern = teamPatterns.find((item) => item.test.test(prompt)) || defaultPattern;
  return { mode: "domain-blueprint", summary: `Built a domain research brief for ${pattern.name.toLowerCase()} using proven separation of research, planning, execution, quality, and measurement responsibilities.`, findings: [
    { title: "Research before execution", detail: "A dedicated research owner reduces unsupported claims and gives downstream agents a shared evidence packet.", confidence: "high" },
    { title: "Explicit ownership", detail: "Each agent needs one bounded responsibility, named inputs, and named outputs to prevent duplicated or dropped work.", confidence: "high" },
    { title: "Contracted handoffs", detail: "Connections must define both a condition and a payload; visual arrows alone do not create reliable orchestration.", confidence: "high" },
    { title: "Closed learning loop", detail: "Measurement should route findings back to the orchestrator so the team improves rather than only produces output.", confidence: "high" },
  ], sources: [], gaps: ["Add a website or connected knowledge source for company-specific evidence", "Connect a live research model for current web-wide evidence"], completedAt: new Date().toISOString() };
}

const teamSchema = {
  type: "object", additionalProperties: false,
  required: ["name", "description", "objective", "findings", "agents", "edges", "sharedKnowledge", "channels", "triggers", "successMetrics"],
  properties: {
    name: { type: "string" }, description: { type: "string" }, objective: { type: "string" },
    findings: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "detail", "confidence"], properties: { title: { type: "string" }, detail: { type: "string" }, confidence: { type: "string", enum: ["high", "medium", "assumption"] } } } },
    agents: { type: "array", minItems: 3, maxItems: 10, items: { type: "object", additionalProperties: false, required: ["id", "name", "role", "purpose", "tools", "inputs", "outputs", "guardrails"], properties: { id: { type: "string" }, name: { type: "string" }, role: { type: "string" }, purpose: { type: "string" }, tools: { type: "array", items: { type: "string" } }, inputs: { type: "array", items: { type: "string" } }, outputs: { type: "array", items: { type: "string" } }, guardrails: { type: "array", items: { type: "string" } } } } },
    edges: { type: "array", items: { type: "object", additionalProperties: false, required: ["from", "to", "label", "condition", "payload"], properties: { from: { type: "string" }, to: { type: "string" }, label: { type: "string" }, condition: { type: "string" }, payload: { type: "array", items: { type: "string" } } } } },
    sharedKnowledge: { type: "array", items: { type: "string" } }, channels: { type: "array", items: { type: "string" } }, triggers: { type: "array", items: { type: "string" } }, successMetrics: { type: "array", items: { type: "string" } },
  },
};

async function liveResearchTeam(prompt: string, website: string, requestedModel: string): Promise<AgentTeam | null> {
  const runtime = env as unknown as Record<string, string | undefined>;
  const apiKey = runtime.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = runtime.OPENAI_MODEL || (requestedModel === "Fast" ? "gpt-5" : "gpt-5");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model, store: false, tools: [{ type: "web_search", search_context_size: "high" }], include: ["web_search_call.action.sources"], input: [{ role: "developer", content: [{ type: "input_text", text: "You are a principal multi-agent systems architect. Research the requested business domain before designing. Produce bounded specialist roles, non-overlapping ownership, explicit input/output handoff contracts, an orchestration path, a quality gate, and a feedback loop. Never invent company facts. Mark uncertainty and prefer evidence." }] }, { role: "user", content: [{ type: "input_text", text: `Design an effective agent team for this request:\n${prompt}\n${website ? `Company website: ${website}` : "No company website supplied."}` }] }], text: { format: { type: "json_schema", name: "agent_team", strict: true, schema: teamSchema } } }) });
  if (!response.ok) return null;
  const payload = await response.json() as { output?: Array<Record<string, unknown>> };
  const output = payload.output || [];
  const message = output.find((item) => item.type === "message") as { content?: Array<{ type?: string; text?: string }> } | undefined;
  const text = message?.content?.find((item) => item.type === "output_text")?.text;
  if (!text) return null;
  const parsed = JSON.parse(text) as Omit<AgentTeam, "id" | "status" | "creationMode" | "research" | "updatedAt"> & { findings: TeamResearch["findings"] };
  const sourceMap = new Map<string, string>();
  for (const item of output) {
    if (item.type !== "web_search_call") continue;
    const action = item.action as { sources?: Array<{ title?: string; url?: string }> } | undefined;
    for (const source of action?.sources || []) if (source.url) sourceMap.set(source.url, source.title || new URL(source.url).hostname);
  }
  const updatedAt = new Date().toISOString();
  const agents = parsed.agents.map((agent, index) => ({ ...agent, id: agent.id || `member_${index + 1}`, icon: agent.name[0]?.toUpperCase() || "A", accent: accents[index % accents.length] }));
  const knownIds = new Set(agents.map((agent) => agent.id));
  const edges = parsed.edges.filter((edge) => knownIds.has(edge.from) && knownIds.has(edge.to)).map((edge) => ({ ...edge, id: `edge_${crypto.randomUUID()}` }));
  const research: TeamResearch = { mode: "live-ai", summary: `Completed web research before designing ${parsed.name}. The architecture is based on current evidence and the requested operating context.`, findings: parsed.findings, sources: Array.from(sourceMap, ([url, title]) => ({ title, url })).slice(0, 12), gaps: sourceMap.size ? ["Private company data and permissions still require owner review"] : ["No public sources were returned; treat company-specific claims as assumptions"], completedAt: updatedAt };
  return { id: `team_${crypto.randomUUID()}`, name: parsed.name, description: parsed.description, objective: parsed.objective, status: "draft", creationMode: "prompt", agents, edges, sharedKnowledge: parsed.sharedKnowledge, channels: parsed.channels, triggers: parsed.triggers, successMetrics: parsed.successMetrics, research, updatedAt };
}

function normalizeTeam(input: AgentTeam): AgentTeam {
  const updatedAt = new Date().toISOString();
  const agents = input.agents.slice(0, 20).map((agent, index) => ({ ...agent, id: agent.id || `member_${crypto.randomUUID()}`, name: String(agent.name || `Agent ${index + 1}`).slice(0, 80), role: String(agent.role || "Specialist").slice(0, 120), purpose: String(agent.purpose || "").slice(0, 1000), icon: String(agent.icon || agent.name?.[0] || "A").slice(0, 2), accent: accents.includes(agent.accent) ? agent.accent : accents[index % accents.length], tools: (agent.tools || []).slice(0, 20), inputs: (agent.inputs || []).slice(0, 20), outputs: (agent.outputs || []).slice(0, 20), guardrails: (agent.guardrails || []).slice(0, 20) }));
  const ids = new Set(agents.map((agent) => agent.id));
  const edges = (input.edges || []).filter((edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to).slice(0, 60).map((edge) => ({ ...edge, id: edge.id || `edge_${crypto.randomUUID()}`, label: String(edge.label || "handoff").slice(0, 100), condition: String(edge.condition || "Previous work is verified").slice(0, 500), payload: (edge.payload || []).slice(0, 20) }));
  return { ...input, id: input.id || `team_${crypto.randomUUID()}`, name: String(input.name || "New agent team").slice(0, 100), description: String(input.description || "A coordinated agent team.").slice(0, 1000), objective: String(input.objective || "").slice(0, 4000), status: input.status === "published" ? "published" : "draft", creationMode: input.creationMode === "manual" ? "manual" : "prompt", agents, edges, sharedKnowledge: (input.sharedKnowledge || []).slice(0, 30), channels: (input.channels || []).slice(0, 20), triggers: (input.triggers || []).slice(0, 20), successMetrics: (input.successMetrics || []).slice(0, 20), research: input.research || domainResearch(input.objective || "general operations"), updatedAt };
}

async function saveTeam(team: AgentTeam) {
  const db = getD1();
  await db.prepare("INSERT INTO agent_teams (id, owner_id, name, objective, status, creation_mode, research_json, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, objective = excluded.objective, status = excluded.status, creation_mode = excluded.creation_mode, research_json = excluded.research_json, config_json = excluded.config_json, updated_at = excluded.updated_at")
    .bind(team.id, "workspace", team.name, team.objective, team.status, team.creationMode, JSON.stringify(team.research), JSON.stringify(team), team.updatedAt, team.updatedAt).run();
}

export async function GET() {
  try {
    await ensureStudioSchema();
    const result = await getD1().prepare("SELECT id, status, config_json, research_json, updated_at FROM agent_teams WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 100").bind("workspace").all<StoredTeamRow>();
    const teams = ((result.results || []) as StoredTeamRow[]).flatMap((row) => { try { const team = JSON.parse(row.config_json) as AgentTeam; return [{ ...team, id: row.id, status: row.status === "published" ? "published" as const : "draft" as const, research: JSON.parse(row.research_json) as TeamResearch, updatedAt: row.updated_at }]; } catch { return []; } });
    return Response.json({ teams });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Team data is unavailable." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    await ensureStudioSchema();
    const body = await request.json() as { action?: string; prompt?: string; website?: string; model?: string; team?: AgentTeam; roles?: string[]; name?: string };
    if (body.action === "generate") {
      const prompt = body.prompt?.trim() || "";
      if (prompt.length < 20) return Response.json({ error: "Describe the team’s objective, audience, and expected outcome in a little more detail." }, { status: 400 });
      if (prompt.length > 12000) return Response.json({ error: "Team briefs are limited to 12,000 characters." }, { status: 413 });
      let team = await liveResearchTeam(prompt, body.website?.trim() || "", body.model || "Auto");
      if (!team) {
        const research = body.website ? await siteResearch(prompt, body.website) : null;
        team = fallbackTeam(prompt, research || domainResearch(prompt));
      }
      await saveTeam(team);
      return Response.json({ team }, { status: 201 });
    }
    if (body.action === "manual") {
      const prompt = body.prompt?.trim() || "Coordinate the selected specialists around one shared objective.";
      const roles = (body.roles || []).map((role) => String(role).trim()).filter(Boolean).slice(0, 20);
      if (roles.length < 2) return Response.json({ error: "Add at least two team roles." }, { status: 400 });
      const research: TeamResearch = { ...domainResearch(prompt), mode: "manual", summary: "Manual team initialized with explicit role ownership and editable handoff contracts." };
      const team = fallbackTeam(prompt, research, "manual", roles, body.name || `${titleCase(prompt).slice(0, 35)} Team`);
      await saveTeam(team);
      return Response.json({ team }, { status: 201 });
    }
    if (body.action === "save" && body.team) {
      const team = normalizeTeam(body.team);
      await saveTeam(team);
      return Response.json({ team });
    }
    if (body.action === "publish" && body.team) {
      const team = normalizeTeam({ ...body.team, status: "published" });
      if (team.agents.length < 2 || !team.edges.length) return Response.json({ error: "Connect at least two agents before publishing this team." }, { status: 409 });
      await saveTeam(team);
      return Response.json({ team });
    }
    return Response.json({ error: "Unknown team action." }, { status: 400 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Team operation failed." }, { status: 500 }); }
}
