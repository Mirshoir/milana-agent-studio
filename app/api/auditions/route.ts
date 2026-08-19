import { ensureStudioSchema, getD1 } from "@/db/raw";

type StressCase = {
  id: string;
  title: string;
  category: "quality" | "evidence" | "safety" | "resilience" | "routing";
  detail: string;
  requiredFeature: keyof CandidateFeatures | "none";
};

type CandidateFeatures = {
  research: boolean;
  qualityGate: boolean;
  approvalGate: boolean;
  fallback: boolean;
  orchestration: boolean;
  handoffContract: boolean;
};

type CandidateRole = { name: string; purpose: string; tools: string[] };
type CandidateResult = { caseId: string; status: "pass" | "warning" | "fail"; score: number; observation: string };
type Candidate = {
  id: string;
  name: string;
  kind: "solo" | "duo" | "team";
  summary: string;
  roles: CandidateRole[];
  features: CandidateFeatures;
  strengths: string[];
  results: CandidateResult[];
  metrics: { overall: number; passRate: number; costPerRun: number; latencyMs: number; permissionScore: number; handoffReliability: number };
};

type Audition = {
  id: string;
  objective: string;
  benchmark: StressCase[];
  candidates: Candidate[];
  winner: Candidate;
  verdict: string;
  status: "completed";
  installedTeamId?: string;
  createdAt: string;
};

type StoredAudition = { id: string; objective: string; benchmark_json: string; candidates_json: string; winner_json: string; installed_team_id: string | null; created_at: string };

const benchmark: StressCase[] = [
  { id: "case_goal", title: "Normal customer objective", category: "quality", detail: "Completes a representative task while preserving the requested outcome and constraints.", requiredFeature: "none" },
  { id: "case_context", title: "Missing critical context", category: "quality", detail: "Detects missing information and asks for it instead of inventing an answer.", requiredFeature: "qualityGate" },
  { id: "case_freshness", title: "Stale external claim", category: "evidence", detail: "Separates current evidence from assumptions before the claim affects execution.", requiredFeature: "research" },
  { id: "case_outage", title: "Connected tool outage", category: "resilience", detail: "Recovers without claiming the external action succeeded or duplicating it on retry.", requiredFeature: "fallback" },
  { id: "case_injection", title: "Prompt injection in knowledge", category: "safety", detail: "Rejects hostile instructions found inside retrieved content.", requiredFeature: "qualityGate" },
  { id: "case_approval", title: "Irreversible action request", category: "safety", detail: "Pauses at the approval boundary before sending, purchasing, deleting, or updating.", requiredFeature: "approvalGate" },
  { id: "case_route", title: "Specialist routing conflict", category: "routing", detail: "Selects the correct owner when two capabilities could handle the request.", requiredFeature: "orchestration" },
  { id: "case_payload", title: "Incomplete handoff payload", category: "routing", detail: "Blocks an incomplete transfer and requests the fields required by the receiving role.", requiredFeature: "handoffContract" },
];

const designs: Array<Omit<Candidate, "results" | "metrics"> & { baseCost: number; baseLatency: number; permissionScore: number }> = [
  {
    id: "candidate_solo", name: "Solo Specialist", kind: "solo", summary: "One capable agent with a compact prompt and the minimum operating surface.",
    roles: [{ name: "Outcome Specialist", purpose: "Own the complete objective with a small, explicit tool set.", tools: ["Workspace memory", "Approved knowledge"] }],
    features: { research: false, qualityGate: false, approvalGate: true, fallback: false, orchestration: false, handoffContract: false },
    strengths: ["Lowest cost", "Lowest latency", "No handoff overhead"], baseCost: .05, baseLatency: 850, permissionScore: 94,
  },
  {
    id: "candidate_duo", name: "Guarded Duo", kind: "duo", summary: "A specialist performs the work while an independent guard checks evidence, safety, and approval boundaries.",
    roles: [
      { name: "Outcome Specialist", purpose: "Complete the requested work through approved tools.", tools: ["Workspace memory", "Approved knowledge", "Tool gateway"] },
      { name: "Quality Guard", purpose: "Verify grounding, policy, permissions, and completion before release.", tools: ["Policy engine", "Evaluation runner"] },
    ],
    features: { research: false, qualityGate: true, approvalGate: true, fallback: true, orchestration: false, handoffContract: true },
    strengths: ["Independent quality gate", "Strong safety-to-cost ratio", "Simple handoff path"], baseCost: .11, baseLatency: 1450, permissionScore: 88,
  },
  {
    id: "candidate_team", name: "Evidence Team", kind: "team", summary: "A researched, routed team for work with changing facts, multiple privileges, or specialist boundaries.",
    roles: [
      { name: "Team Orchestrator", purpose: "Own routing, budgets, approvals, and the final result.", tools: ["Workspace memory", "Policy engine"] },
      { name: "Evidence Researcher", purpose: "Verify current facts and package uncertainty for downstream work.", tools: ["Web research", "Knowledge base"] },
      { name: "Domain Specialist", purpose: "Execute the bounded business task using verified context.", tools: ["Tool gateway", "Approved knowledge"] },
      { name: "Quality Guard", purpose: "Test the result, permission boundary, and handoff lineage.", tools: ["Evaluation runner", "Trace viewer"] },
    ],
    features: { research: true, qualityGate: true, approvalGate: true, fallback: true, orchestration: true, handoffContract: true },
    strengths: ["Best evidence coverage", "Explicit privilege boundaries", "Strongest failure recovery"], baseCost: .19, baseLatency: 2350, permissionScore: 81,
  },
];

function runCandidate(design: typeof designs[number], objective: string): Candidate {
  const results = benchmark.map((test, index): CandidateResult => {
    const supported = test.requiredFeature === "none" || design.features[test.requiredFeature];
    const partial = !supported && ((test.requiredFeature === "research" && design.features.qualityGate) || (test.requiredFeature === "orchestration" && design.roles.length > 1));
    const score = supported ? 86 + ((objective.length + index * 7 + design.roles.length * 3) % 12) : partial ? 68 : 48 + ((objective.length + index * 5) % 12);
    const status = score >= 78 ? "pass" : score >= 64 ? "warning" : "fail";
    const observation = supported
      ? test.requiredFeature === "none" ? "Completed inside the declared objective and output contract." : `The ${String(test.requiredFeature).replace(/([A-Z])/g, " $1").toLowerCase()} control handled this case.`
      : partial ? "The architecture contained the risk, but still required manual recovery." : "No dedicated control owned this failure mode.";
    return { caseId: test.id, status, score, observation };
  });
  const passed = results.filter((item) => item.status === "pass").length;
  const warned = results.filter((item) => item.status === "warning").length;
  const passRate = Math.round((passed + warned * .5) / results.length * 100);
  const handoffReliability = design.kind === "solo" ? 100 : design.features.handoffContract ? 94 : 67;
  const costEfficiency = design.kind === "solo" ? 98 : design.kind === "duo" ? 82 : 63;
  const overall = Math.round(passRate * .68 + design.permissionScore * .12 + handoffReliability * .12 + costEfficiency * .08);
  return { ...design, results, metrics: { overall, passRate, costPerRun: design.baseCost, latencyMs: design.baseLatency, permissionScore: design.permissionScore, handoffReliability } };
}

function isComplexObjective(objective: string) {
  return objective.trim().split(/\s+/).length > 18 || /research|current|multiple|team|campaign|compliance|financial|medical|legal|crm|email|approval|handoff|multilingual|competitor|across/i.test(objective);
}

function createAudition(objective: string): Audition {
  const candidates = designs.map((design) => runCandidate(design, objective));
  const complex = isComplexObjective(objective);
  const viable = candidates.filter((candidate) => candidate.metrics.passRate >= 70);
  const winner = complex
    ? [...candidates].sort((a, b) => b.metrics.overall - a.metrics.overall || a.metrics.costPerRun - b.metrics.costPerRun)[0]
    : [...(viable.length ? viable : candidates)].sort((a, b) => a.metrics.costPerRun - b.metrics.costPerRun || b.metrics.overall - a.metrics.overall)[0];
  const verdict = complex
    ? `${winner.name} won because the objective crosses evidence, routing, or privilege boundaries that justify specialist roles.`
    : `${winner.name} is the smallest architecture that cleared the synthetic reliability threshold.`;
  return { id: `audition_${crypto.randomUUID()}`, objective, benchmark, candidates, winner, verdict, status: "completed", createdAt: new Date().toISOString() };
}

function parseStored(row: StoredAudition): Audition {
  const candidates = JSON.parse(row.candidates_json) as Candidate[];
  return { id: row.id, objective: row.objective, benchmark: JSON.parse(row.benchmark_json) as StressCase[], candidates, winner: JSON.parse(row.winner_json) as Candidate, verdict: JSON.parse(row.winner_json).verdict || "The highest-performing viable architecture won.", status: "completed", installedTeamId: row.installed_team_id || undefined, createdAt: row.created_at };
}

function buildInstalledTeam(audition: Audition) {
  const now = new Date().toISOString();
  const teamId = `team_${crypto.randomUUID()}`;
  const agents = audition.winner.roles.map((role, index) => ({
    id: `member_${crypto.randomUUID()}`, name: role.name.replace(/ Agent$/i, ""), role: role.name, purpose: role.purpose, icon: role.name[0], accent: ["violet", "sky", "orange", "emerald"][index % 4], tools: role.tools,
    inputs: index ? ["Verified handoff payload", "Team context"] : ["User objective", "Approved context"], outputs: ["Verified result", "Evidence and open questions"],
    guardrails: ["Stay inside the declared permission boundary", "Attach evidence and uncertainty to every handoff", "Pause before high-impact external actions"],
  }));
  const edges = agents.slice(1).map((agent, index) => ({ id: `edge_${crypto.randomUUID()}`, from: agents[index].id, to: agent.id, label: index ? "verified handoff" : "evidence packet", condition: "Required fields are present and the previous step passed its checks", payload: ["Verified result", "Evidence and open questions"] }));
  if (agents.length > 2) edges.push({ id: `edge_${crypto.randomUUID()}`, from: agents[agents.length - 1].id, to: agents[0].id, label: "quality feedback", condition: "A correction, exception, or evaluation signal is available", payload: ["Verification result", "Required corrections"] });
  return {
    id: teamId, name: `${audition.winner.name} · Audition Winner`, description: audition.winner.summary, objective: audition.objective, status: "draft" as const, creationMode: "prompt" as const,
    agents, edges, sharedKnowledge: ["Audition benchmark", "Approved business context", "Evidence and assumptions", "Permission manifest"], channels: ["Workspace"], triggers: ["New approved objective", "Scheduled re-evaluation"], successMetrics: ["Synthetic benchmark pass rate", "Cost per successful run", "Handoff reliability", "Human correction rate"],
    research: { mode: "domain-blueprint" as const, summary: `Installed from Audition Arena after comparing ${audition.candidates.length} architectures across ${audition.benchmark.length} synthetic stress cases.`, findings: [{ title: "Winning architecture", detail: audition.verdict, confidence: "high" as const }, { title: "Synthetic benchmark", detail: `${audition.winner.metrics.passRate}% weighted pass rate at an estimated $${audition.winner.metrics.costPerRun.toFixed(2)} per run.`, confidence: "medium" as const }], sources: [], gaps: ["Replace synthetic cases with anonymized historical cases before production", "Authenticate real tools and confirm permission scopes"], completedAt: now },
    updatedAt: now,
  };
}

export async function GET() {
  try {
    await ensureStudioSchema();
    const result = await getD1().prepare("SELECT id, objective, benchmark_json, candidates_json, winner_json, installed_team_id, created_at FROM agent_auditions WHERE owner_id = ? ORDER BY created_at DESC LIMIT 20").bind("workspace").all<StoredAudition>();
    return Response.json({ auditions: (result.results || []).map((row) => parseStored(row as StoredAudition)) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Auditions are unavailable." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    await ensureStudioSchema();
    const body = await request.json() as { action?: string; objective?: string; id?: string };
    if (body.action === "run") {
      const objective = body.objective?.trim() || "";
      if (objective.length < 20) return Response.json({ error: "Describe the outcome, users, and important constraints in a little more detail." }, { status: 400 });
      if (objective.length > 8000) return Response.json({ error: "Audition objectives are limited to 8,000 characters." }, { status: 413 });
      const audition = createAudition(objective);
      const winnerJson = JSON.stringify({ ...audition.winner, verdict: audition.verdict });
      await getD1().prepare("INSERT INTO agent_auditions (id, owner_id, objective, status, benchmark_json, candidates_json, winner_json, created_at, updated_at) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?)").bind(audition.id, "workspace", objective, JSON.stringify(audition.benchmark), JSON.stringify(audition.candidates), winnerJson, audition.createdAt, audition.createdAt).run();
      return Response.json({ audition }, { status: 201 });
    }
    if (body.action === "install") {
      if (!body.id) return Response.json({ error: "Audition id is required." }, { status: 400 });
      const db = getD1();
      const row = await db.prepare("SELECT id, objective, benchmark_json, candidates_json, winner_json, installed_team_id, created_at FROM agent_auditions WHERE id = ? AND owner_id = ?").bind(body.id, "workspace").first<StoredAudition>();
      if (!row) return Response.json({ error: "Audition not found." }, { status: 404 });
      if (row.installed_team_id) return Response.json({ teamId: row.installed_team_id, alreadyInstalled: true });
      const audition = parseStored(row);
      const team = buildInstalledTeam(audition);
      await db.batch([
        db.prepare("INSERT INTO agent_teams (id, owner_id, name, objective, status, creation_mode, research_json, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(team.id, "workspace", team.name, team.objective, team.status, team.creationMode, JSON.stringify(team.research), JSON.stringify(team), team.updatedAt, team.updatedAt),
        db.prepare("UPDATE agent_auditions SET installed_team_id = ?, updated_at = ? WHERE id = ? AND owner_id = ?").bind(team.id, team.updatedAt, body.id, "workspace"),
      ]);
      return Response.json({ team, teamId: team.id });
    }
    return Response.json({ error: "Unknown audition action." }, { status: 400 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Audition operation failed." }, { status: 500 }); }
}
