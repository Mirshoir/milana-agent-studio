import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const agentProfiles = sqliteTable("agent_profiles", {
  id: text("id").primaryKey(),
  registryId: integer("registry_id").notNull(),
  name: text("name").notNull(),
  squad: text("squad").notNull(),
  purpose: text("purpose").notNull(),
  activation: text("activation").notNull(),
  status: text("status").notNull().default("draft"),
  activeVersionId: text("active_version_id"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_agent_profiles_registry_id").on(table.registryId)]);

export const promptVersions = sqliteTable("prompt_versions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  version: integer("version").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  routingRule: text("routing_rule").notNull(),
  guardrails: text("guardrails").notNull(),
  modelTier: text("model_tier").notNull().default("small"),
  status: text("status").notNull().default("draft"),
  changeNote: text("change_note").notNull().default(""),
  createdBy: text("created_by").notNull().default("Agent Studio"),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_prompt_versions_agent_version").on(table.agentId, table.version)]);

export const evalCases = sqliteTable("eval_cases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  language: text("language").notNull(),
  customerMessage: text("customer_message").notNull(),
  expectedBehavior: text("expected_behavior").notNull(),
  tags: text("tags").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
});

export const evalRuns = sqliteTable("eval_runs", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  promptVersionId: text("prompt_version_id"),
  evalCaseId: text("eval_case_id"),
  customerMessage: text("customer_message").notNull(),
  response: text("response").notNull(),
  groundedScore: real("grounded_score").notNull(),
  languageScore: real("language_score").notNull(),
  salesScore: real("sales_score").notNull(),
  safetyScore: real("safety_score").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  status: text("status").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_eval_runs_agent_created").on(table.agentId, table.createdAt)]);

export const releaseEvents = sqliteTable("release_events", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  promptVersionId: text("prompt_version_id").notNull(),
  environment: text("environment").notNull(),
  action: text("action").notNull(),
  approver: text("approver").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_release_events_agent_created").on(table.agentId, table.createdAt)]);
