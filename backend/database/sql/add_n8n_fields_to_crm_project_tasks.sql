-- Eseguire manualmente su produzione se le migration Laravel non sono disponibili
ALTER TABLE `crm_project_tasks`
    ADD COLUMN `execution_mode` VARCHAR(20) NOT NULL DEFAULT 'human' AFTER `created_by`,
    ADD COLUMN `n8n_status` VARCHAR(20) NULL AFTER `execution_mode`,
    ADD COLUMN `n8n_response` JSON NULL AFTER `n8n_status`,
    ADD COLUMN `n8n_response_format` VARCHAR(50) NULL AFTER `n8n_response`,
    ADD COLUMN `n8n_error` TEXT NULL AFTER `n8n_response_format`,
    ADD COLUMN `n8n_completed_at` TIMESTAMP NULL AFTER `n8n_error`;
