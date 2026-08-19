CREATE TABLE `agent_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'workspace' NOT NULL,
	`name` text NOT NULL,
	`objective` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`creation_mode` text DEFAULT 'prompt' NOT NULL,
	`research_json` text NOT NULL,
	`config_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_agent_teams_owner_updated` ON `agent_teams` (`owner_id`,`updated_at`);