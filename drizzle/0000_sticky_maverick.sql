CREATE TABLE `agent_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`registry_id` integer NOT NULL,
	`name` text NOT NULL,
	`squad` text NOT NULL,
	`purpose` text NOT NULL,
	`activation` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`active_version_id` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_profiles_registry_id` ON `agent_profiles` (`registry_id`);--> statement-breakpoint
CREATE TABLE `eval_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`language` text NOT NULL,
	`customer_message` text NOT NULL,
	`expected_behavior` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `eval_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`prompt_version_id` text,
	`eval_case_id` text,
	`customer_message` text NOT NULL,
	`response` text NOT NULL,
	`grounded_score` real NOT NULL,
	`language_score` real NOT NULL,
	`sales_score` real NOT NULL,
	`safety_score` real NOT NULL,
	`latency_ms` integer NOT NULL,
	`status` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prompt_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`version` integer NOT NULL,
	`system_prompt` text NOT NULL,
	`routing_rule` text NOT NULL,
	`guardrails` text NOT NULL,
	`model_tier` text DEFAULT 'small' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`change_note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT 'Agent Studio' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_prompt_versions_agent_version` ON `prompt_versions` (`agent_id`,`version`);--> statement-breakpoint
CREATE TABLE `release_events` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`prompt_version_id` text NOT NULL,
	`environment` text NOT NULL,
	`action` text NOT NULL,
	`approver` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
