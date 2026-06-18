-- Tabella pivot per gestire accesso utenti a CRM Departments
CREATE TABLE IF NOT EXISTS `user_crm_departments` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT(20) UNSIGNED NOT NULL,
  `crm_department_id` BIGINT(20) UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_crm` (`user_id`, `crm_department_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_crm_department_id` (`crm_department_id`),
  CONSTRAINT `fk_user_crm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_crm_department` FOREIGN KEY (`crm_department_id`) REFERENCES `crm_departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aggiungi colonna per memorizzare il CRM corrente selezionato (per sessione)
ALTER TABLE `users` 
ADD COLUMN `current_crm_department_id` BIGINT(20) UNSIGNED NULL DEFAULT NULL COMMENT 'CRM Department corrente selezionato dall''utente' AFTER `current_role`,
ADD FOREIGN KEY (`current_crm_department_id`) REFERENCES `crm_departments` (`id`) ON DELETE SET NULL;

