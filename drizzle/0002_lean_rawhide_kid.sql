CREATE TABLE `file_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`content` text NOT NULL,
	`character_count` integer NOT NULL,
	`token_estimate` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_file_chunks_file_index` ON `file_chunks` (`file_id`,`chunk_index`);--> statement-breakpoint
CREATE TABLE `knowledge_files` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`chunk_size` integer NOT NULL,
	`chunk_overlap` integer NOT NULL,
	`chunk_count` integer NOT NULL,
	`analysis_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_knowledge_files_agent_created` ON `knowledge_files` (`agent_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `prompt_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`score` integer NOT NULL,
	`analysis_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_prompt_analyses_agent_created` ON `prompt_analyses` (`agent_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `workflow_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`nodes_json` text NOT NULL,
	`edges_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_definitions_updated` ON `workflow_definitions` (`updated_at`);