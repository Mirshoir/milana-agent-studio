CREATE TABLE `marketplace_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'workspace' NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`description` text NOT NULL,
	`config_json` text NOT NULL,
	`installs` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_marketplace_agents_owner_updated` ON `marketplace_agents` (`owner_id`,`updated_at`);