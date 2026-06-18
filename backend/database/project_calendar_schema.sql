-- Schema per il Calendario Progetto
-- Tabelle per eventi, call, scadenze e promemoria

-- Tabella eventi progetto
CREATE TABLE IF NOT EXISTS `project_calendar_events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT UNSIGNED NOT NULL,
    `type` ENUM('event', 'call', 'deadline', 'reminder') NOT NULL DEFAULT 'event',
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `start_time` DATETIME NOT NULL,
    `end_time` DATETIME NOT NULL,
    `location` VARCHAR(255) NULL COMMENT 'Per eventi',
    `call_link` VARCHAR(500) NULL COMMENT 'Per call',
    `call_notes` TEXT NULL COMMENT 'Per call',
    `deadline_type` VARCHAR(100) NULL COMMENT 'Per scadenze',
    `color` VARCHAR(7) NULL COMMENT 'Colore esadecimale',
    `visibility` ENUM('all', 'freelance', 'specific') NOT NULL DEFAULT 'all',
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_project_id` (`project_id`),
    INDEX `idx_start_time` (`start_time`),
    INDEX `idx_type` (`type`),
    INDEX `idx_created_by` (`created_by`),
    FOREIGN KEY (`project_id`) REFERENCES `crm_projects` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella visibilità eventi (per visibility = 'specific')
CREATE TABLE IF NOT EXISTS `project_calendar_event_visibility` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_event_user` (`event_id`, `user_id`),
    INDEX `idx_event_id` (`event_id`),
    INDEX `idx_user_id` (`user_id`),
    FOREIGN KEY (`event_id`) REFERENCES `project_calendar_events` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella notifiche call
CREATE TABLE IF NOT EXISTS `project_calendar_call_notifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `call_id` BIGINT UNSIGNED NOT NULL,
    `notification_type` ENUM('email', 'in_app') NOT NULL,
    `minutes_before` INT NOT NULL COMMENT 'Minuti prima della call (10 o 5)',
    `sent_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_call_id` (`call_id`),
    INDEX `idx_sent_at` (`sent_at`),
    FOREIGN KEY (`call_id`) REFERENCES `project_calendar_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella collegamento task-eventi (per task già esistenti)
CREATE TABLE IF NOT EXISTS `project_calendar_task_links` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` BIGINT UNSIGNED NOT NULL,
    `task_id` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_event_task` (`event_id`, `task_id`),
    INDEX `idx_event_id` (`event_id`),
    INDEX `idx_task_id` (`task_id`),
    FOREIGN KEY (`event_id`) REFERENCES `project_calendar_events` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`task_id`) REFERENCES `crm_project_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

