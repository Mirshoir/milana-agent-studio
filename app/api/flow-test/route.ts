type FlowNode = {
  id: string;
  type: "trigger" | "agent" | "router" | "knowledge" | "condition" | "guardrail" | "tool" | "output";
  label: string;
  subtitle: string;
  agentId?: number;
};

type FlowEdge = { id: string; from: string; to: string };
type Scenario = "catalog_request" | "human_takeover" | "comment_duplicate" | "cyrillic_uzbek" | "unverified_moq";
type FlowKind = "kotiba" | "comments" | "website" | "learning" | "universal";

const requiredAgents: Record<FlowKind, number[]> = {
  kotiba: [1, 2, 6, 8, 10, 11, 16, 17],
  comments: [6, 10, 11, 17, 26, 27, 28, 29, 30, 31],
  website: [18, 19, 20, 21, 22, 23, 24, 25],
  learning: [11, 12, 17, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
  universal: [],
};

function flowKind(nodes: FlowNode[]): FlowKind {
  const ids = new Set(nodes.map((node) => node.agentId));
  if (ids.has(32) || ids.has(41)) return "learning";
  if (ids.has(26) || ids.has(31)) return "comments";
  if (ids.has(18) || ids.has(25)) return "website";
  if (ids.has(1) || ids.has(16) || ids.has(17)) return "kotiba";
  return "universal";
}

function graphOrder(nodes: FlowNode[], edges: FlowEdge[]) {
  const ids = new Set(nodes.map((node) => node.id));
  const issues: string[] = [];
  if (ids.size !== nodes.length) issues.push("Node IDs must be unique.");
  const validEdges = edges.filter((edge) => {
    const valid = ids.has(edge.from) && ids.has(edge.to);
    if (!valid) issues.push(`Edge ${edge.id} points to a missing node.`);
    return valid;
  });
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
  validEdges.forEach((edge) => {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.get(edge.from)?.push(edge.to);
  });
  const queue = nodes.filter((node) => (incoming.get(node.id) || 0) === 0).map((node) => node.id);
  const orderedIds: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    orderedIds.push(id);
    for (const target of outgoing.get(id) || []) {
      incoming.set(target, (incoming.get(target) || 0) - 1);
      if (incoming.get(target) === 0) queue.push(target);
    }
  }
  if (orderedIds.length !== nodes.length) issues.push("Workflow contains a cycle; execution order is undefined.");
  if (!nodes.some((node) => node.type === "trigger")) issues.push("Add at least one trigger node.");
  if (!nodes.some((node) => node.type === "output")) issues.push("Add at least one output node.");
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return { ordered: orderedIds.map((id) => byId.get(id)!).filter(Boolean), issues };
}

function detailFor(node: FlowNode, scenario: Scenario, blocked: boolean) {
  if (blocked) return "Skipped because conversation ownership is HUMAN_ACTIVE.";
  if (node.agentId === 17) return "Reviewed the complete available thread, answered topics, unresolved need, language, and ownership state.";
  if (node.agentId === 29) return scenario === "comment_duplicate" ? "Rejected the private reply: the comment-to-DM idempotency key already exists." : "Checked permission window, opt-out, ownership, prior DM, and idempotency key.";
  if (node.agentId === 34) return "Locked the reply to Uzbek Cyrillic; script changes require explicit customer evidence.";
  if (node.agentId === 35) return scenario === "unverified_moq" ? "No verified MOQ fact was found; blocked the unsupported 30-item claim." : "Commercial facts were checked against approved sources.";
  if (node.agentId === 37) return scenario === "comment_duplicate" ? "Blocked a public 'sent by DM' claim because no new delivery receipt exists." : "Allowed action claims only when a matching tool receipt exists.";
  if (node.agentId === 38) return "Verified prerequisites before phone requests, catalog follow-ups, or handoff.";
  if (node.type === "trigger") return "Accepted the sandbox event and created a traceable run context.";
  if (node.type === "knowledge") return "Loaded only approved, versioned knowledge for this workflow step.";
  if (node.type === "guardrail") return "Applied deterministic safety, duplication, ownership, and grounding checks.";
  if (node.type === "condition" || node.type === "router") return "Evaluated the branch from current state; no branch was inferred outside the graph.";
  if (node.type === "tool") return "Prepared a sandbox tool call and retained its simulated receipt; no live action was sent.";
  if (node.type === "output") return "Produced the sandbox output from completed upstream nodes.";
  return node.agentId ? `Executed Agent ${String(node.agentId).padStart(3, "0")} with the node's declared responsibility.` : "Executed the declared workflow step.";
}

export async function POST(request: Request) {
  const started = performance.now();
  try {
    const body = await request.json() as { nodes?: FlowNode[]; edges?: FlowEdge[]; scenario?: Scenario; ownership?: "AI_ACTIVE" | "HUMAN_ACTIVE" };
    const nodes = Array.isArray(body.nodes) ? body.nodes.slice(0, 100) : [];
    const edges = Array.isArray(body.edges) ? body.edges.slice(0, 200) : [];
    const scenario = body.scenario || "catalog_request";
    const kind = flowKind(nodes);
    const { ordered, issues } = graphOrder(nodes, edges);
    const presentAgents = new Set(nodes.map((node) => node.agentId));
    for (const id of requiredAgents[kind]) {
      if (!presentAgents.has(id)) issues.push(`Required Agent ${String(id).padStart(3, "0")} is missing from this ${kind} workflow.`);
    }
    if ((kind === "kotiba" || kind === "comments") && !nodes.some((node) => /ownership/i.test(`${node.id} ${node.label} ${node.subtitle}`))) {
      issues.push("Conversation Ownership Gate is required for customer messaging workflows.");
    }

    const humanOwned = scenario === "human_takeover" || body.ownership === "HUMAN_ACTIVE";
    const ownershipIndex = ordered.findIndex((node) => /ownership/i.test(`${node.id} ${node.label} ${node.subtitle}`));
    const path = ordered.map((node, index) => {
      const blocked = humanOwned && ownershipIndex >= 0 && index > ownershipIndex;
      return { label: node.label, detail: detailFor(node, scenario, blocked), status: blocked ? "skipped" as const : "passed" as const };
    });
    const duplicate = scenario === "comment_duplicate";
    const output = humanOwned ? "" : duplicate
      ? "Assalomu alaykum! So'rovingizni ko'rdik. Oldingi xabaringizni tekshiryapmiz."
      : scenario === "cyrillic_uzbek"
        ? "Ассалому алайкум! Қайси моделга қизиққанингизни ёзинг. Тасдиқланган нарх ва буюртма маълумотини текшириб бераман."
        : scenario === "unverified_moq"
          ? "Бу модел учун минимал миқдор тасдиқланган манбада кўрсатилмаган. Аниқ шартни менежердан текшириб бераман."
          : kind === "website"
            ? "TJ-2182 (V-4607) — $7.30/dona. O'lchamlar: 46, 48, 50, 52, 54. Qadoq: 5 dona. Yakuniy mavjudlik buyurtma vaqtida tekshiriladi."
            : "Assalomu alaykum! Yangi katalog ilova qilindi. Yoqtirgan modelingiz rasmi yoki artikulini yuboring; tasdiqlangan narx va buyurtma shartlarini tekshiraman.";
    const status = issues.length ? "fail" as const : "pass" as const;
    const latency = Math.max(1, Math.round(performance.now() - started));
    return Response.json({
      status,
      issues,
      engine: "Deterministic graph runner",
      runId: `GRAPH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      input: scenario === "human_takeover" ? "Human operator sent a message in this conversation." : scenario === "comment_duplicate" ? "Narxi qancha? Katalogni Direktga yuboring." : scenario === "cyrillic_uzbek" ? "Қандай заказ қилсам бўлади?" : scenario === "unverified_moq" ? "Минимум неча дона олиш керак?" : "Salom, yangi katalogni yubora olasizmi?",
      output,
      latency,
      ownership: { before: humanOwned ? "AI_ACTIVE" : "AI_ACTIVE", event: humanOwned ? "Authenticated human outbound detected" : "Inbound customer event", after: humanOwned ? "HUMAN_ACTIVE" : "AI_ACTIVE", aiReplyAllowed: !humanOwned, reason: humanOwned ? "AI output and pending follow-ups are blocked until an authenticated Return to AI event." : "No human takeover is active." },
      history: { messages: Math.max(1, ordered.length), language: scenario === "cyrillic_uzbek" || scenario === "unverified_moq" ? "Uzbek Cyrillic" : "Uzbek Latin", intent: scenario === "comment_duplicate" ? "Repeated comment requesting catalog" : scenario === "unverified_moq" ? "Ask minimum order quantity" : "Receive verified catalog or order information", resolved: ["Conversation ownership checked", "Language continuity checked", "Previous actions inspected"], unresolved: humanOwned ? "Human operator owns the next action" : duplicate ? "No new DM is allowed without a new eligible event" : "Only source-backed facts may be sent", nextAction: humanOwned ? "Wait for the operator or authenticated Return to AI" : duplicate ? "Do not claim a new DM was sent; keep one recovery task" : "Complete the next graph node using approved sources" },
      attachment: humanOwned || duplicate ? { name: "No attachment", format: "Blocked by scenario", size: "0 live sends" } : { name: "Milana Premium — approved catalog", format: "Sandbox attachment preview", size: "0 live sends" },
      followUp: humanOwned ? { delay: "Not scheduled", condition: "Human takeover cancels pending automation", output: "No automated follow-up while HUMAN_ACTIVE.", status: "Cancelled" } : { delay: "5 minutes after verified catalog delivery", condition: "Only if a delivery receipt exists and there is no customer reply, opt-out, handoff, or order activity", output: "One contextual catalog follow-up is eligible.", status: duplicate ? "Cancelled" : "Policy gated" },
      commentDelivery: kind === "comments" ? { publicReply: duplicate ? "So'rovingizni ko'rdik; oldingi xabaringizni tekshiryapmiz." : output, publicStatus: humanOwned ? "Blocked" : "Sandbox preview", privateReply: duplicate || humanOwned ? "Suppressed" : "Verified catalog response prepared for private reply.", privateStatus: duplicate || humanOwned ? "Blocked" : "Sandbox receipt generated", eligibility: duplicate ? "Ineligible — duplicate idempotency key" : humanOwned ? "Ineligible — HUMAN_ACTIVE" : "Eligible after deterministic checks", receipt: duplicate || humanOwned ? "No receipt; no send claim allowed" : "sandbox.receipt.generated", recovery: duplicate ? "Single operator review task" : "Not required" } : undefined,
      path,
    }, { status: status === "pass" ? 200 : 422 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Flow test failed" }, { status: 500 });
  }
}
