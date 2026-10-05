CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` integer NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assets_proposal_id_idx` ON `assets` (`proposal_id`);