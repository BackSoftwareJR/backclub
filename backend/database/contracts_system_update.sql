-- Aggiornamento schema contratti per gestione workflow richiesta contratto
-- Aggiunge stati 'requested' e 'pending_signature' alla tabella contracts

ALTER TABLE `contracts` 
MODIFY COLUMN `status` ENUM('draft','requested','pending_signature','active','suspended','completed','terminated') 
DEFAULT 'draft' 
COMMENT 'Stato contratto: draft=bozza, requested=richiesta da preventivo, pending_signature=in attesa di firma, active=attivo, suspended=sospeso, completed=completato, terminated=terminato';

-- Tabella per gestire revisioni del contratto
CREATE TABLE IF NOT EXISTS `contract_revisions` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `contract_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a contracts',
  `revision_number` INT NOT NULL DEFAULT 1 COMMENT 'Numero revisione (1, 2, 3, ecc.)',
  `contract_file` VARCHAR(500) NOT NULL COMMENT 'Path file contratto revisione',
  `notes` TEXT DEFAULT NULL COMMENT 'Note sulla revisione',
  `created_by` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a users (creatore revisione)',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_contract_revision` (`contract_id`, `revision_number`),
  INDEX `idx_contract` (`contract_id`),
  INDEX `idx_revision_number` (`revision_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Revisioni contratti';

