CREATE TABLE `agent_evidence_records` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`revision_id` text,
	`claim` text NOT NULL,
	`status` text NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text,
	`confidence` real NOT NULL,
	`affects_json` text DEFAULT '[]' NOT NULL,
	`retrieved_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_agent_evidence_records_agent_created` ON `agent_evidence_records` (`agent_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `agent_package_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`manifest_json` text NOT NULL,
	`readiness_score` integer NOT NULL,
	`evidence_coverage` integer NOT NULL,
	`changelog` text DEFAULT 'Initial published package' NOT NULL,
	`created_at` text NOT NULL,
	`published_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_package_revisions_agent_version` ON `agent_package_revisions` (`agent_id`,`version`);