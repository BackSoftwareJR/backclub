-- Chat / step del workflow N8N per task agente
CREATE TABLE IF NOT EXISTS `crm_project_task_n8n_steps` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `crm_project_task_id` BIGINT UNSIGNED NOT NULL,
    `step_key` VARCHAR(100) NULL,
    `step_index` INT UNSIGNED NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'running',
    `title` VARCHAR(255) NULL,
    `message` TEXT NULL,
    `actor_type` VARCHAR(20) NOT NULL DEFAULT 'agent',
    `actor_name` VARCHAR(120) NULL,
    `payload` JSON NULL,
    `progress` TINYINT UNSIGNED NULL,
    `is_final` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    KEY `crm_project_task_n8n_steps_task_created` (`crm_project_task_id`, `created_at`),
    CONSTRAINT `crm_project_task_n8n_steps_task_fk`
        FOREIGN KEY (`crm_project_task_id`) REFERENCES `crm_project_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
