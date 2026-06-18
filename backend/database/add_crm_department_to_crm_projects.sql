-- Aggiunge crm_department_id alla tabella crm_projects
ALTER TABLE `crm_projects`
ADD COLUMN IF NOT EXISTS `crm_department_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a crm_departments' AFTER `seller_id`,
ADD FOREIGN KEY IF NOT EXISTS (`crm_department_id`) REFERENCES `crm_departments`(`id`) ON DELETE SET NULL;

