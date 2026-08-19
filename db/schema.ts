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

export const workflowDefinitions = sqliteTable("workflow_definitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("draft"),
  nodesJson: text("nodes_json").notNull(),
  edgesJson: text("edges_json").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_workflow_definitions_updated").on(table.updatedAt)]);

export const knowledgeFiles = sqliteTable("knowledge_files", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  chunkSize: integer("chunk_size").notNull(),
  chunkOverlap: integer("chunk_overlap").notNull(),
  chunkCount: integer("chunk_count").notNull(),
  analysisJson: text("analysis_json").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_knowledge_files_agent_created").on(table.agentId, table.createdAt)]);

export const fileChunks = sqliteTable("file_chunks", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  characterCount: integer("character_count").notNull(),
  tokenEstimate: integer("token_estimate").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_file_chunks_file_index").on(table.fileId, table.chunkIndex)]);

export const promptAnalyses = sqliteTable("prompt_analyses", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  score: integer("score").notNull(),
  analysisJson: text("analysis_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_prompt_analyses_agent_created").on(table.agentId, table.createdAt)]);

export const marketplaceAgents = sqliteTable("marketplace_agents", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().default("workspace"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("draft"),
  visibility: text("visibility").notNull().default("private"),
  description: text("description").notNull(),
  configJson: text("config_json").notNull(),
  installs: integer("installs").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_marketplace_agents_owner_updated").on(table.ownerId, table.updatedAt)]);

export const agentPackageRevisions = sqliteTable("agent_package_revisions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  version: integer("version").notNull(),
  status: text("status").notNull().default("published"),
  manifestJson: text("manifest_json").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  evidenceCoverage: integer("evidence_coverage").notNull(),
  changelog: text("changelog").notNull().default("Initial published package"),
  createdAt: text("created_at").notNull(),
  publishedAt: text("published_at").notNull(),
}, (table) => [
  uniqueIndex("idx_agent_package_revisions_agent_version").on(table.agentId, table.version),
]);

export const agentEvidenceRecords = sqliteTable("agent_evidence_records", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  revisionId: text("revision_id"),
  claim: text("claim").notNull(),
  status: text("status").notNull(),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url"),
  confidence: real("confidence").notNull(),
  affectsJson: text("affects_json").notNull().default("[]"),
  retrievedAt: text("retrieved_at").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_agent_evidence_records_agent_created").on(table.agentId, table.createdAt)]);

export const agentTeams = sqliteTable("agent_teams", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().default("workspace"),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  status: text("status").notNull().default("draft"),
  creationMode: text("creation_mode").notNull().default("prompt"),
  researchJson: text("research_json").notNull(),
  configJson: text("config_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_agent_teams_owner_updated").on(table.ownerId, table.updatedAt)]);
