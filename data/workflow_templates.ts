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
  website: websiteQaWorkflow,
};
