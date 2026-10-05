CREATE TABLE `limits` (
	`id` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`key_hash` text NOT NULL,
	`data` text NOT NULL,
	`snapshot` text,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`submitted_at` text,
	`title_submitted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposals_code_unique` ON `proposals` (`code`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`proposal_id` integer,
	`expires` integer NOT NULL
);
