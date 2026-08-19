import { env } from "cloudflare:workers";

export function getD1() {
  if (!env.DB) throw new Error("Agent Studio database binding is unavailable.");
  return env.DB;
}

export function getFilesBucket() {
  if (!env.FILES) throw new Error("Agent Studio file storage binding is unavailable.");
  return env.FILES;
}

export async function ensureStudioSchema() {
  const db = getD1();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS agent_profiles (id TEXT PRIMARY KEY, registry_id INTEGER NOT NULL UNIQUE, name TEXT NOT NULL, squad TEXT NOT NULL, purpose TEXT NOT NULL, activation TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', active_version_id TEXT, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS prompt_versions (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, version INTEGER NOT NULL, system_prompt TEXT NOT NULL, routing_rule TEXT NOT NULL, guardrails TEXT NOT NULL, model_tier TEXT NOT NULL DEFAULT 'small', status TEXT NOT NULL DEFAULT 'draft', change_note TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL DEFAULT 'Agent Studio', created_at TEXT NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_versions_agent_version ON prompt_versions(agent_id, version)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_prompt_versions_agent_created ON prompt_versions(agent_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS eval_cases (id TEXT PRIMARY KEY, title TEXT NOT NULL, language TEXT NOT NULL, customer_message TEXT NOT NULL, expected_behavior TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS eval_runs (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, prompt_version_id TEXT, eval_case_id TEXT, customer_message TEXT NOT NULL, response TEXT NOT NULL, grounded_score REAL NOT NULL, language_score REAL NOT NULL, sales_score REAL NOT NULL, safety_score REAL NOT NULL, latency_ms INTEGER NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_eval_runs_agent_created ON eval_runs(agent_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS release_events (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, prompt_version_id TEXT NOT NULL, environment TEXT NOT NULL, action TEXT NOT NULL, approver TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_release_events_agent_created ON release_events(agent_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS workflow_definitions (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', nodes_json TEXT NOT NULL, edges_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_workflow_definitions_updated ON workflow_definitions(updated_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS knowledge_files (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, storage_key TEXT NOT NULL, chunk_size INTEGER NOT NULL, chunk_overlap INTEGER NOT NULL, chunk_count INTEGER NOT NULL, analysis_json TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_knowledge_files_agent_created ON knowledge_files(agent_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS file_chunks (id TEXT PRIMARY KEY, file_id TEXT NOT NULL, chunk_index INTEGER NOT NULL, content TEXT NOT NULL, character_count INTEGER NOT NULL, token_estimate INTEGER NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_file_chunks_file_index ON file_chunks(file_id, chunk_index)"),
    db.prepare("CREATE TABLE IF NOT EXISTS prompt_analyses (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT, score INTEGER NOT NULL, analysis_json TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_prompt_analyses_agent_created ON prompt_analyses(agent_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS marketplace_agents (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL DEFAULT 'workspace', name TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', visibility TEXT NOT NULL DEFAULT 'private', description TEXT NOT NULL, config_json TEXT NOT NULL, installs INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_marketplace_agents_owner_updated ON marketplace_agents(owner_id, updated_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS agent_package_revisions (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'published', manifest_json TEXT NOT NULL, readiness_score INTEGER NOT NULL, evidence_coverage INTEGER NOT NULL, changelog TEXT NOT NULL DEFAULT 'Initial published package', created_at TEXT NOT NULL, published_at TEXT NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_package_revisions_agent_version ON agent_package_revisions(agent_id, version)"),
    db.prepare("CREATE TABLE IF NOT EXISTS agent_evidence_records (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, revision_id TEXT, claim TEXT NOT NULL, status TEXT NOT NULL, source_type TEXT NOT NULL, source_url TEXT, confidence REAL NOT NULL, affects_json TEXT NOT NULL DEFAULT '[]', retrieved_at TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_agent_evidence_records_agent_created ON agent_evidence_records(agent_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS agent_teams (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL DEFAULT 'workspace', name TEXT NOT NULL, objective TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', creation_mode TEXT NOT NULL DEFAULT 'prompt', research_json TEXT NOT NULL, config_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_agent_teams_owner_updated ON agent_teams(owner_id, updated_at DESC)"),
  ]);
}
