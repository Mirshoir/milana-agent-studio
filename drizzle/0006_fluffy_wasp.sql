CREATE TABLE `agent_auditions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'workspace' NOT NULL,
	`objective` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`benchmark_json` text NOT NULL,
	`candidates_json` text NOT NULL,
	`winner_json` text NOT NULL,
	`installed_team_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_agent_auditions_owner_created` ON `agent_auditions` (`owner_id`,`created_at`);