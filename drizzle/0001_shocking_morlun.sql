CREATE TABLE `saved_research` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`mode` enum('quick','deep','eli10','expert','step','compare','discovery') NOT NULL DEFAULT 'quick',
	`sources` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_research_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `saved_research` ADD CONSTRAINT `saved_research_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `saved_research_owner_updated_idx` ON `saved_research` (`user_id`,`updated_at`);