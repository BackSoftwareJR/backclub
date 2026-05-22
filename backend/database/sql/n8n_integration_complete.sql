-- =============================================================================
-- BackClub / Sunlight CRM — Integrazione N8N task agente (script completo)
-- Eseguire su MySQL (phpMyAdmin o terminale: mysql -u USER -p DATABASE < file.sql)
-- Database tipico produzione: u589701076_backclub (verifica il tuo nome DB)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- PARTE 1: Colonne su crm_project_tasks
-- Se una colonna esiste già, MySQL darà errore #1060 — ignora quella riga
-- oppure commenta le ADD COLUMN già presenti.
-- -----------------------------------------------------------------------------

ALTER TABLE `crm_project_tasks`
    ADD COLUMN `execution_mode` VARCHAR(20) NOT NULL DEFAULT 'human' COMMENT 'agent|agent_human|human' AFTER `created_by`;

ALTER TABLE `crm_project_tasks`
    ADD COLUMN `n8n_status` VARCHAR(20) NULL COMMENT 'pending|processing|completed|failed|skipped' AFTER `execution_mode`;

ALTER TABLE `crm_project_tasks`
    ADD COLUMN `n8n_response` JSON NULL AFTER `n8n_status`;

ALTER TABLE `crm_project_tasks`
    ADD COLUMN `n8n_response_format` VARCHAR(50) NULL AFTER `n8n_response`;

ALTER TABLE `crm_project_tasks`
    ADD COLUMN `n8n_error` TEXT NULL AFTER `n8n_response_format`;

ALTER TABLE `crm_project_tasks`
    ADD COLUMN `n8n_completed_at` TIMESTAMP NULL AFTER `n8n_error`;

-- Task esistenti: modalità umana di default
UPDATE `crm_project_tasks`
SET `execution_mode` = 'human'
WHERE `execution_mode` IS NULL OR `execution_mode` = '';

-- -----------------------------------------------------------------------------
-- PARTE 2: Tabella chat / step workflow N8N
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `crm_project_task_n8n_steps` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `crm_project_task_id` BIGINT UNSIGNED NOT NULL,
    `step_key` VARCHAR(100) NULL,
    `step_index` INT UNSIGNED NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'running' COMMENT 'pending|running|completed|failed',
    `title` VARCHAR(255) NULL,
    `message` TEXT NULL,
    `actor_type` VARCHAR(20) NOT NULL DEFAULT 'agent',
    `actor_name` VARCHAR(120) NULL,
    `payload` JSON NULL,
    `progress` TINYINT UNSIGNED NULL,
    `is_final` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `crm_project_task_n8n_steps_task_created` (`crm_project_task_id`, `created_at`),
    CONSTRAINT `crm_project_task_n8n_steps_task_fk`
        FOREIGN KEY (`crm_project_task_id`)
        REFERENCES `crm_project_tasks` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- VERIFICA (opzionale — esegui a mano dopo lo script)
-- =============================================================================
-- SHOW COLUMNS FROM crm_project_tasks LIKE 'execution_mode';
-- SHOW COLUMNS FROM crm_project_tasks LIKE 'n8n_%';
-- SHOW TABLES LIKE 'crm_project_task_n8n_steps';
-- SELECT COUNT(*) FROM crm_project_task_n8n_steps;
