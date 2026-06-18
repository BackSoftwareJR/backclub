-- Tabella pivot per gestire ruoli multipli per utente
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) UNSIGNED NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `is_primary` TINYINT(1) DEFAULT 0 COMMENT 'Ruolo principale (default al login)',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_role` (`user_id`, `role`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role` (`role`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrazione dati esistenti: copia il ruolo attuale dalla colonna role alla nuova tabella
-- Usa INSERT IGNORE per evitare errori se alcuni record esistono già
INSERT IGNORE INTO `user_roles` (`user_id`, `role`, `is_primary`, `created_at`, `updated_at`)
SELECT 
    `id` as `user_id`,
    `role`,
    1 as `is_primary`, -- Il ruolo esistente diventa il ruolo principale
    `created_at`,
    `updated_at`
FROM `users`
WHERE `role` IS NOT NULL AND `role` != ''
AND NOT EXISTS (
    SELECT 1 FROM `user_roles` ur 
    WHERE ur.`user_id` = `users`.`id` 
    AND ur.`role` = `users`.`role`
);

-- Aggiungi colonna per memorizzare il ruolo corrente selezionato (per sessione)
ALTER TABLE `users` 
ADD COLUMN `current_role` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Ruolo corrente selezionato dall''utente' AFTER `role`;

