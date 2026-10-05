CREATE TABLE `mail_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` integer NOT NULL,
	`kind` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE INDEX `mail_proposal_idx` ON `mail_outbox` (`proposal_id`);--> statement-breakpoint
CREATE TABLE `mail_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`encrypted_secret` text NOT NULL,
	`updated_at` text NOT NULL
);
