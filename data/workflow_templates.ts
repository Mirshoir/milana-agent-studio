export type FlowNode = {
  id: string;
  type: "trigger" | "agent" | "router" | "knowledge" | "condition" | "guardrail" | "tool" | "output";
  label: string;
  subtitle: string;
  x: number;
  y: number;
  agentId?: number;
};

export type FlowEdge = { id: string; from: string; to: string };

export type WorkflowTemplate = {
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export const CURRENT_WORKFLOW_ID = "flow_current_kotiba_instagram_v1";
export const UNIVERSAL_WORKFLOW_ID = "flow_universal_omnichannel_v1";
export const MILANA_WEBSITE_QA_WORKFLOW_ID = "flow_milanapremium_website_qa_v1";
export const MILANA_INSTAGRAM_COMMENTS_WORKFLOW_ID = "flow_milana_instagram_comments_v1";
export const MILANA_INSTAGRAM_LEARNING_WORKFLOW_ID = "flow_milana_instagram_account_learning_v1";

export const currentKotibaWorkflow: WorkflowTemplate = {
  name: "Current Kotiba Instagram sales path",
  description: "Locked production snapshot saved before the universal workflow workspace was introduced.",
  nodes: [
    { id:"trigger_1", type:"trigger", label:"Instagram inbound", subtitle:"Message or media event", x:44, y:170 },
    { id:"ownership_gate", type:"guardrail", label:"Conversation Ownership Gate", subtitle:"Block AI while a human owns the chat", x:270, y:430 },
    { id:"agent_1", type:"agent", label:"Sales Agent Orchestrator", subtitle:"Agent 001 · Core fast path", x:270, y:170, agentId:1 },
    { id:"agent_2", type:"agent", label:"Intent Agent", subtitle:"Agent 002 · Core fast path", x:458, y:60, agentId:2 },
    { id:"agent_3", type:"agent", label:"Customer Memory Agent", subtitle:"Agent 006 · Core fast path", x:458, y:280, agentId:6 },
    { id:"agent_history", type:"agent", label:"Conversation History Analyzer", subtitle:"Agent 017 · Analyze full chat first", x:650, y:60, agentId:17 },
    { id:"agent_4", type:"agent", label:"Reasoning Agent", subtitle:"Agent 008 · Uses history analysis", x:650, y:280, agentId:8 },
    { id:"agent_5", type:"agent", label:"Handoff Agent", subtitle:"Agent 010 · On demand", x:842, y:22, agentId:10 },
    { id:"tool_catalog", type:"tool", label:"Catalog Delivery", subtitle:"Attach the current approved catalog", x:842, y:170 },
    { id:"agent_6", type:"agent", label:"Audit Log Agent", subtitle:"Agent 011 · Async or scheduled", x:842, y:318, agentId:11 },
    { id:"output_1", type:"output", label:"Reply or manager handoff", subtitle:"Instagram DM / Kotiba manager", x:1034, y:170 },
    { id:"agent_7", type:"agent", label:"Catalog Follow-Up Agent", subtitle:"Agent 016 · Wait 5m · cancel on reply", x:1034, y:330, agentId:16 },
    { id:"output_followup", type:"output", label:"Send follow-up", subtitle:"Only if customer remains silent", x:1034, y:470 },
  ],
  edges: [
    {id:"e0",from:"trigger_1",to:"ownership_gate"},{id:"e1",from:"ownership_gate",to:"agent_1"},{id:"e2",from:"agent_1",to:"agent_2"},{id:"e3",from:"agent_1",to:"agent_3"},{id:"e4",from:"agent_2",to:"agent_history"},{id:"e5",from:"agent_3",to:"agent_history"},{id:"e6",from:"agent_history",to:"agent_4"},{id:"e7",from:"agent_4",to:"agent_5"},{id:"e8",from:"agent_4",to:"tool_catalog"},{id:"e9",from:"agent_4",to:"agent_6"},{id:"e10",from:"agent_5",to:"output_1"},{id:"e11",from:"tool_catalog",to:"output_1"},{id:"e12",from:"agent_6",to:"output_1"},{id:"e13",from:"tool_catalog",to:"agent_7"},{id:"e14",from:"agent_7",to:"output_followup"},
  ],
};

export const universalOmnichannelWorkflow: WorkflowTemplate = {
  name: "Universal Omnichannel Agent Workflow",
  description: "Reusable agent runtime for websites, bots, API automations, ChatGPT, Claude, and MCP-compatible clients.",
  nodes: [
    { id:"universal_trigger", type:"trigger", label:"Universal inbound", subtitle:"Website · Bot · API · Webhook · MCP", x:30, y:175 },
    { id:"access_gateway", type:"guardrail", label:"Access & Tenant Gateway", subtitle:"Authenticate caller and isolate tenant data", x:225, y:175 },
    { id:"protocol_router", type:"router", label:"Channel Adapter", subtitle:"Normalize REST, webhook, MCP, chat, and bot input", x:420, y:175 },
    { id:"agent_selector", type:"router", label:"Agent Selector", subtitle:"Pick one agent or an approved agent pack", x:615, y:175 },
    { id:"history_agent", type:"agent", label:"Conversation History Analyzer", subtitle:"Agent 017 · Recover session context", x:810, y:55, agentId:17 },
    { id:"knowledge_context", type:"knowledge", label:"Knowledge & Files", subtitle:"Tenant-approved retrieval context", x:810, y:175 },
    { id:"ownership_guard", type:"guardrail", label:"Ownership & Safety Gate", subtitle:"Permissions · human takeover · policy", x:810, y:295 },
    { id:"orchestrator", type:"agent", label:"Sales Agent Orchestrator", subtitle:"Agent 001 · Coordinate selected specialists", x:1005, y:175, agentId:1 },
    { id:"reasoning_agent", type:"agent", label:"Reasoning Agent", subtitle:"Agent 008 · Choose the next action", x:1005, y:55, agentId:8 },
    { id:"handoff_agent", type:"agent", label:"Handoff Agent", subtitle:"Agent 010 · Route to a human when required", x:1005, y:295, agentId:10 },
    { id:"response_adapter", type:"output", label:"Universal response", subtitle:"JSON · stream · message · tool result", x:1195, y:175 },
    { id:"audit_agent", type:"agent", label:"Audit Log Agent", subtitle:"Agent 011 · Trace every decision", x:1195, y:315, agentId:11 },
  ],
  edges: [
    {id:"u1",from:"universal_trigger",to:"access_gateway"},
    {id:"u2",from:"access_gateway",to:"protocol_router"},
    {id:"u3",from:"protocol_router",to:"agent_selector"},
    {id:"u4",from:"agent_selector",to:"history_agent"},
    {id:"u5",from:"agent_selector",to:"knowledge_context"},
    {id:"u6",from:"agent_selector",to:"ownership_guard"},
    {id:"u7",from:"history_agent",to:"reasoning_agent"},
    {id:"u8",from:"knowledge_context",to:"orchestrator"},
    {id:"u9",from:"ownership_guard",to:"orchestrator"},
    {id:"u10",from:"reasoning_agent",to:"orchestrator"},
    {id:"u11",from:"orchestrator",to:"handoff_agent"},
    {id:"u12",from:"orchestrator",to:"response_adapter"},
    {id:"u13",from:"handoff_agent",to:"response_adapter"},
    {id:"u14",from:"orchestrator",to:"audit_agent"},
  ],
};

export const milanaWebsiteQaWorkflow: WorkflowTemplate = {
  name: "MilanaPremium.uz Customer Q&A",
  description: "Isolated draft for the existing website assistant. Grounds every answer in the live SQLite catalog, approved website policies, and authenticated customer data before replying or handing off.",
  nodes: [
    { id:"web_trigger", type:"trigger", label:"Website chat inbound", subtitle:"Existing milanapremium.uz AI shopping assistant", x:20, y:185 },
    { id:"web_history", type:"agent", label:"Conversation History Analyzer", subtitle:"Agent 017 · Review the full available session", x:205, y:55, agentId:17 },
    { id:"web_intent", type:"agent", label:"Intent Agent", subtitle:"Agent 002 · Detect language and customer job", x:205, y:315, agentId:2 },
    { id:"web_source_router", type:"router", label:"Website Source Router", subtitle:"Choose catalog, policy, or authenticated customer data", x:400, y:185 },
    { id:"web_catalog", type:"knowledge", label:"Live Website Catalog", subtitle:"SQLite milana.db · active products only", x:600, y:35 },
    { id:"web_policy", type:"knowledge", label:"Approved Website Policies", subtitle:"Ordering · support · terms · privacy · partnership", x:600, y:185 },
    { id:"web_customer_data", type:"guardrail", label:"Authenticated Customer Scope", subtitle:"Account and order data only for the verified owner", x:600, y:335 },
    { id:"web_integrity", type:"agent", label:"Website Source Integrity Agent", subtitle:"Agent 025 · Enforce source precedence and flag conflicts", x:800, y:185, agentId:25 },
    { id:"web_orchestrator", type:"agent", label:"Website Service Orchestrator", subtitle:"Agent 018 · Invoke the smallest specialist set", x:995, y:185, agentId:18 },
    { id:"web_catalog_agent", type:"agent", label:"Product Catalog Retrieval Agent", subtitle:"Agent 019 · Search verified active products", x:1190, y:15, agentId:19 },
    { id:"web_pack_agent", type:"agent", label:"Stock, Pack & Price Agent", subtitle:"Agent 020 · Product-specific price, MOQ, and availability", x:1190, y:115, agentId:20 },
    { id:"web_recommend_agent", type:"agent", label:"Product Recommendation Agent", subtitle:"Agent 021 · Rank matching products", x:1190, y:215, agentId:21 },
    { id:"web_policy_agent", type:"agent", label:"Ordering & Policy Agent", subtitle:"Agent 022 · Approved commercial and policy answers", x:1190, y:315, agentId:22 },
    { id:"web_support_agent", type:"agent", label:"Account, Order & Support Agent", subtitle:"Agent 023 · Authenticated operations and support", x:1190, y:415, agentId:23 },
    { id:"web_composer", type:"agent", label:"Multilingual Website Response Agent", subtitle:"Agent 024 · Uzbek, Russian, or English answer", x:1390, y:185, agentId:24 },
    { id:"web_answer_guard", type:"guardrail", label:"Website Answer Guardrail", subtitle:"No invented stock, timing, payment, discount, or private data", x:1585, y:185 },
    { id:"web_handoff", type:"agent", label:"Handoff Agent", subtitle:"Agent 010 · Escalate manager-only or unresolved cases", x:1780, y:315, agentId:10 },
    { id:"web_output", type:"output", label:"Website answer", subtitle:"Text · product cards · human handoff", x:1780, y:145 },
    { id:"web_audit", type:"agent", label:"Audit Log Agent", subtitle:"Agent 011 · Record sources, decisions, and result", x:1970, y:245, agentId:11 },
  ],
  edges: [
    {id:"mw1",from:"web_trigger",to:"web_history"},{id:"mw2",from:"web_trigger",to:"web_intent"},
    {id:"mw3",from:"web_history",to:"web_source_router"},{id:"mw4",from:"web_intent",to:"web_source_router"},
    {id:"mw5",from:"web_source_router",to:"web_catalog"},{id:"mw6",from:"web_source_router",to:"web_policy"},{id:"mw7",from:"web_source_router",to:"web_customer_data"},
    {id:"mw8",from:"web_catalog",to:"web_integrity"},{id:"mw9",from:"web_policy",to:"web_integrity"},{id:"mw10",from:"web_customer_data",to:"web_integrity"},
    {id:"mw11",from:"web_integrity",to:"web_orchestrator"},
    {id:"mw12",from:"web_orchestrator",to:"web_catalog_agent"},{id:"mw13",from:"web_orchestrator",to:"web_pack_agent"},{id:"mw14",from:"web_orchestrator",to:"web_recommend_agent"},{id:"mw15",from:"web_orchestrator",to:"web_policy_agent"},{id:"mw16",from:"web_orchestrator",to:"web_support_agent"},
    {id:"mw17",from:"web_catalog_agent",to:"web_composer"},{id:"mw18",from:"web_pack_agent",to:"web_composer"},{id:"mw19",from:"web_recommend_agent",to:"web_composer"},{id:"mw20",from:"web_policy_agent",to:"web_composer"},{id:"mw21",from:"web_support_agent",to:"web_composer"},
    {id:"mw22",from:"web_composer",to:"web_answer_guard"},{id:"mw23",from:"web_answer_guard",to:"web_output"},{id:"mw24",from:"web_answer_guard",to:"web_handoff"},
    {id:"mw25",from:"web_output",to:"web_audit"},{id:"mw26",from:"web_handoff",to:"web_audit"},
  ],
};

export const blankWorkflow: WorkflowTemplate = {
  name: "Untitled workflow",
  description: "A new reusable agent workflow.",
  nodes: [
    { id:"new_trigger", type:"trigger", label:"Input trigger", subtitle:"Choose an integration source", x:90, y:180 },
    { id:"new_selector", type:"router", label:"Agent Selector", subtitle:"Choose an agent or agent pack", x:390, y:180 },
    { id:"new_output", type:"output", label:"Response", subtitle:"Return output to the calling integration", x:690, y:180 },
  ],
  edges: [
    { id:"new_e1", from:"new_trigger", to:"new_selector" },
    { id:"new_e2", from:"new_selector", to:"new_output" },
  ],
};

export const websiteQaWorkflow: WorkflowTemplate = {
  ...blankWorkflow,
  name: "Website Q&A Workflow",
  description: "Grounded website assistant with knowledge retrieval and safe escalation.",
  nodes: [
    { id:"web_trigger", type:"trigger", label:"Website question", subtitle:"Chat widget or embedded form", x:60, y:180 },
    { id:"web_history", type:"agent", label:"Conversation History Analyzer", subtitle:"Agent 017 · Restore session context", x:285, y:75, agentId:17 },
    { id:"web_knowledge", type:"knowledge", label:"Website Knowledge", subtitle:"Approved pages, files, and business facts", x:285, y:285 },
    { id:"web_reasoning", type:"agent", label:"Reasoning Agent", subtitle:"Agent 008 · Build a grounded answer", x:545, y:180, agentId:8 },
    { id:"web_guard", type:"guardrail", label:"Answer Guardrail", subtitle:"Block unsupported claims and private data", x:800, y:180 },
    { id:"web_output", type:"output", label:"Website response", subtitle:"Stream answer or request human help", x:1040, y:180 },
  ],
  edges: [
    {id:"w1",from:"web_trigger",to:"web_history"},{id:"w2",from:"web_trigger",to:"web_knowledge"},{id:"w3",from:"web_history",to:"web_reasoning"},{id:"w4",from:"web_knowledge",to:"web_reasoning"},{id:"w5",from:"web_reasoning",to:"web_guard"},{id:"w6",from:"web_guard",to:"web_output"},
  ],
};

export const milanaInstagramCommentsWorkflow: WorkflowTemplate = {
  name: "Milana Instagram Comments → DM",
  description: "Sandbox workflow for safe public comment replies and verified private replies. Public and DM delivery are tracked independently; failed or ineligible DMs create a recovery action instead of being silently treated as sent.",
  nodes: [
    { id:"comment_trigger", type:"trigger", label:"Instagram comment webhook", subtitle:"Comment ID · user · media/post context · timestamp", x:20, y:185 },
    { id:"comment_dedupe", type:"guardrail", label:"Event & Duplicate Guard", subtitle:"Verify webhook, deduplicate comment and prior private reply", x:205, y:185 },
    { id:"comment_post_context", type:"knowledge", label:"Post & Product Context", subtitle:"Caption · reel/media · linked catalog product · approved facts", x:395, y:35 },
    { id:"comment_history", type:"agent", label:"Conversation History Analyzer", subtitle:"Agent 017 · Review prior comments, DMs, ownership, and language", x:395, y:185, agentId:17 },
    { id:"comment_intent", type:"agent", label:"Comment Context & Intent Agent", subtitle:"Agent 026 · Detect sales intent, language, risk, and DM need", x:395, y:335, agentId:26 },
    { id:"comment_router", type:"router", label:"Public / Private Action Router", subtitle:"Choose public-only, public + private reply, hide, or human review", x:595, y:185 },
    { id:"comment_public_safety", type:"agent", label:"Public Comment Safety Agent", subtitle:"Agent 027 · Block PII, private terms, unsupported claims, and spam", x:790, y:35, agentId:27 },
    { id:"comment_public_composer", type:"agent", label:"Public Reply Composer Agent", subtitle:"Agent 028 · Short reply in the commenter's current language", x:985, y:35, agentId:28 },
    { id:"comment_public_output", type:"output", label:"Publish comment reply", subtitle:"Store public reply ID and independent delivery status", x:1180, y:35 },
    { id:"comment_dm_eligibility", type:"agent", label:"Private Reply Eligibility Agent", subtitle:"Agent 029 · Permission, time window, duplicate, ownership, and intent", x:790, y:215, agentId:29 },
    { id:"comment_dm_gate", type:"condition", label:"Private reply allowed?", subtitle:"Eligible sales lead and no prior private reply", x:985, y:215 },
    { id:"comment_dm_dispatch", type:"agent", label:"Instagram Private Reply Dispatcher", subtitle:"Agent 030 · Send by comment ID and retain Meta receipt", x:1180, y:215, agentId:30 },
    { id:"comment_dm_verify", type:"agent", label:"DM Delivery Verification Agent", subtitle:"Agent 031 · Confirm accepted message ID or classify failure", x:1375, y:215, agentId:31 },
    { id:"comment_dm_output", type:"output", label:"Private reply delivered", subtitle:"Open/continue customer DM only after verified acceptance", x:1570, y:145 },
    { id:"comment_recovery", type:"output", label:"Retry or operator task", subtitle:"One safe retry for transient errors; otherwise human queue", x:1570, y:315 },
    { id:"comment_memory", type:"agent", label:"Customer Memory Agent", subtitle:"Agent 006 · Join comment and DM into one customer journey", x:1765, y:145, agentId:6 },
    { id:"comment_handoff", type:"agent", label:"Handoff Agent", subtitle:"Agent 010 · Complaints, sensitive cases, and unresolved failures", x:1765, y:315, agentId:10 },
    { id:"comment_audit", type:"agent", label:"Audit Log Agent", subtitle:"Agent 011 · Record both sends, receipts, retries, and final state", x:1960, y:215, agentId:11 },
  ],
  edges: [
    {id:"c1",from:"comment_trigger",to:"comment_dedupe"},
    {id:"c2",from:"comment_dedupe",to:"comment_post_context"},{id:"c3",from:"comment_dedupe",to:"comment_history"},{id:"c4",from:"comment_dedupe",to:"comment_intent"},
    {id:"c5",from:"comment_post_context",to:"comment_router"},{id:"c6",from:"comment_history",to:"comment_router"},{id:"c7",from:"comment_intent",to:"comment_router"},
    {id:"c8",from:"comment_router",to:"comment_public_safety"},{id:"c9",from:"comment_public_safety",to:"comment_public_composer"},{id:"c10",from:"comment_public_composer",to:"comment_public_output"},
    {id:"c11",from:"comment_router",to:"comment_dm_eligibility"},{id:"c12",from:"comment_dm_eligibility",to:"comment_dm_gate"},{id:"c13",from:"comment_dm_gate",to:"comment_dm_dispatch"},{id:"c14",from:"comment_dm_dispatch",to:"comment_dm_verify"},
    {id:"c15",from:"comment_dm_verify",to:"comment_dm_output"},{id:"c16",from:"comment_dm_verify",to:"comment_recovery"},
    {id:"c17",from:"comment_dm_output",to:"comment_memory"},{id:"c18",from:"comment_recovery",to:"comment_handoff"},{id:"c19",from:"comment_memory",to:"comment_audit"},{id:"c20",from:"comment_handoff",to:"comment_audit"},{id:"c21",from:"comment_public_output",to:"comment_audit"},
  ],
};

export const milanaInstagramAccountLearningWorkflow: WorkflowTemplate = {
  name: "Milana Instagram Account Learning",
  description: "Read-only account intelligence workflow that learns from approved Instagram posts, comments, DMs, ad referrals, catalog events, and outcomes. It redacts PII, verifies cross-channel state, and produces reviewable findings without sending messages or changing production prompts.",
  nodes: [
    { id:"learn_trigger", type:"trigger", label:"Instagram read-only ingestion", subtitle:"Posts · comments · DMs · ads · delivery receipts · outcomes", x:20, y:185 },
    { id:"learn_access", type:"guardrail", label:"Read-Only Access Fence", subtitle:"No replies, reactions, deletes, labels, or account changes", x:205, y:185 },
    { id:"learn_account", type:"agent", label:"Instagram Account Learning Agent", subtitle:"Agent 032 · Discover recurring account patterns", x:395, y:35, agentId:32 },
    { id:"learn_history", type:"agent", label:"Conversation History Analyzer", subtitle:"Agent 017 · Review full available conversation", x:395, y:185, agentId:17 },
    { id:"learn_external", type:"agent", label:"External Sync Agent", subtitle:"Agent 012 · Reconcile human and automation events", x:395, y:335, agentId:12 },
    { id:"learn_event_store", type:"knowledge", label:"Normalized Account Event Store", subtitle:"Comment, DM, ad, catalog, receipt, ownership, and outcome timeline", x:590, y:185 },
    { id:"learn_identity", type:"agent", label:"Customer Identity & Event Correlation Agent", subtitle:"Agent 033 · Join comment → DM → catalog → lead", x:785, y:35, agentId:33 },
    { id:"learn_language", type:"agent", label:"Language & Script Lock Agent", subtitle:"Agent 034 · Uzbek Latin/Cyrillic · Russian · Kazakh", x:785, y:135, agentId:34 },
    { id:"learn_truth", type:"agent", label:"Instagram Sales Truth Agent", subtitle:"Agent 035 · Verify MOQ, pack, price, sizes, delivery, and address", x:785, y:235, agentId:35 },
    { id:"learn_attribution", type:"agent", label:"Advertisement & Post Context Agent", subtitle:"Agent 039 · Preserve reel, post, product, CTA, and campaign", x:785, y:335, agentId:39 },
    { id:"learn_catalog", type:"agent", label:"Catalog Fulfillment Agent", subtitle:"Agent 036 · Select asset and verify actual delivery", x:985, y:35, agentId:36 },
    { id:"learn_claim", type:"agent", label:"Action Claim Validator Agent", subtitle:"Agent 037 · Block “sent” claims without a receipt", x:985, y:155, agentId:37 },
    { id:"learn_prerequisite", type:"agent", label:"Conversation Prerequisite Agent", subtitle:"Agent 038 · Enforce the correct next action", x:985, y:275, agentId:38 },
    { id:"learn_sla", type:"agent", label:"Inbox SLA & Missed Lead Recovery Agent", subtitle:"Agent 040 · Find unanswered, failed, and overdue leads", x:1185, y:75, agentId:40 },
    { id:"learn_privacy", type:"agent", label:"Privacy & Learning Dataset Curator Agent", subtitle:"Agent 041 · Redact PII and label approved examples", x:1185, y:255, agentId:41 },
    { id:"learn_review", type:"guardrail", label:"Human Learning Approval", subtitle:"No prompt, routing, or production change without review", x:1385, y:165 },
    { id:"learn_report", type:"output", label:"Account Intelligence Report", subtitle:"Patterns · failures · agent changes · eval cases · coverage gaps", x:1585, y:165 },
    { id:"learn_audit", type:"agent", label:"Audit Log Agent", subtitle:"Agent 011 · Record sources and learning decisions", x:1785, y:165, agentId:11 },
  ],
  edges: [
    {id:"l1",from:"learn_trigger",to:"learn_access"},
    {id:"l2",from:"learn_access",to:"learn_account"},{id:"l3",from:"learn_access",to:"learn_history"},{id:"l4",from:"learn_access",to:"learn_external"},
    {id:"l5",from:"learn_account",to:"learn_event_store"},{id:"l6",from:"learn_history",to:"learn_event_store"},{id:"l7",from:"learn_external",to:"learn_event_store"},
    {id:"l8",from:"learn_event_store",to:"learn_identity"},{id:"l9",from:"learn_event_store",to:"learn_language"},{id:"l10",from:"learn_event_store",to:"learn_truth"},{id:"l11",from:"learn_event_store",to:"learn_attribution"},
    {id:"l12",from:"learn_identity",to:"learn_catalog"},{id:"l13",from:"learn_language",to:"learn_claim"},{id:"l14",from:"learn_truth",to:"learn_claim"},{id:"l15",from:"learn_attribution",to:"learn_prerequisite"},
    {id:"l16",from:"learn_catalog",to:"learn_sla"},{id:"l17",from:"learn_claim",to:"learn_sla"},{id:"l18",from:"learn_prerequisite",to:"learn_privacy"},
    {id:"l19",from:"learn_sla",to:"learn_review"},{id:"l20",from:"learn_privacy",to:"learn_review"},
    {id:"l21",from:"learn_review",to:"learn_report"},{id:"l22",from:"learn_report",to:"learn_audit"},
  ],
};

export const workflowTemplates = {
  blank: blankWorkflow,
  universal: universalOmnichannelWorkflow,
  website: milanaWebsiteQaWorkflow,
  comments: milanaInstagramCommentsWorkflow,
  learning: milanaInstagramAccountLearningWorkflow,
};
