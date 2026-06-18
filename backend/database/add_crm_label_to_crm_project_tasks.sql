-- Aggiunge il campo crm_label_id alla tabella crm_project_tasks
-- Questo campo permette di etichettare una task con un CRM specifico
-- per controllare la visibilità della task

ALTER TABLE `crm_project_tasks`
ADD COLUMN IF NOT EXISTS `crm_label_id` BIGINT UNSIGNED NULL AFTER `crm_project_id`,
ADD INDEX `idx_crm_label_id` (`crm_label_id`),
ADD CONSTRAINT `fk_crm_project_tasks_crm_label` 
    FOREIGN KEY (`crm_label_id`) REFERENCES `crm_departments` (`id`) 
    ON DELETE SET NULL;

    