-- Tabella per documenti firmati aggiuntivi del contratto
CREATE TABLE IF NOT EXISTS `contract_signed_documents` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `contract_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a contracts',
  `document_type` ENUM('privacy_policy', 'consent_personal_data', 'other') NOT NULL COMMENT 'Tipo documento',
  `document_name` VARCHAR(255) NOT NULL COMMENT 'Nome documento (es: Privacy Policy, Consenso Dati Personali)',
  `file_path` VARCHAR(500) NOT NULL COMMENT 'Path file documento',
  `signed_at` DATETIME DEFAULT NULL COMMENT 'Data e ora firma',
  `notes` TEXT DEFAULT NULL COMMENT 'Note sul documento',
  `created_by` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a users (creatore)',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_contract` (`contract_id`),
  INDEX `idx_document_type` (`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Documenti firmati aggiuntivi contratti';

