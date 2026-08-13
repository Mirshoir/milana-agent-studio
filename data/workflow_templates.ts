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

export const workflowTemplates = {
  blank: blankWorkflow,
  universal: universalOmnichannelWorkflow,
  website: milanaWebsiteQaWorkflow,
};
