-- ============================================================
-- USCITE COCCHI ADVANCED SYSTEM - Database Schema (FIXED)
-- Basato sulla struttura reale della tabella
-- ============================================================

-- 1. Estendi tabella uscite_cocchi con nuovi campi
ALTER TABLE `uscite_cocchi`
ADD COLUMN `crm_code` VARCHAR(50) NULL COMMENT 'Collegamento a CRM' AFTER `project_id`,
ADD COLUMN `payment_frequency` ENUM('once', 'weekly', 'monthly', 'quarterly', 'yearly') DEFAULT 'once' COMMENT 'Frequenza pagamento' AFTER `status`,
ADD COLUMN `next_payment_date` DATE NULL COMMENT 'Prossima scadenza per ricorrenti' AFTER `payment_date`,
ADD COLUMN `auto_renew` TINYINT(1) DEFAULT 0 COMMENT 'Rinnovo automatico' AFTER `due_date`,
ADD COLUMN `payment_method` VARCHAR(100) NULL COMMENT 'Metodo di pagamento' AFTER `auto_renew`,
ADD COLUMN `is_recurring` TINYINT(1) DEFAULT 0 COMMENT 'È un pagamento ricorrente' AFTER `payment_method`;

-- 2. Aggiungi indici per performance
ALTER TABLE `uscite_cocchi`
ADD INDEX `uscite_cocchi_crm_code_index` (`crm_code`),
ADD INDEX `uscite_cocchi_status_date_index` (`status`, `payment_date`),
ADD INDEX `uscite_cocchi_recurring_index` (`is_recurring`, `next_payment_date`);

-- 3. Tabella per tracking pagamenti ricorrenti
CREATE TABLE IF NOT EXISTS `uscite_cocchi_recurring` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uscita_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a uscite_cocchi',
  `original_amount` DECIMAL(10, 2) NOT NULL COMMENT 'Importo originale',
  `occurrence_number` INT NOT NULL COMMENT 'Numero occorrenza (1, 2, 3...)',
  `scheduled_date` DATE NOT NULL COMMENT 'Data programmata',
  `paid_date` DATE NULL COMMENT 'Data effettiva pagamento',
  `actual_amount` DECIMAL(10, 2) NULL COMMENT 'Importo effettivamente pagato',
  `status` ENUM('scheduled', 'paid', 'missed', 'cancelled') DEFAULT 'scheduled',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  FOREIGN KEY (`uscita_id`) REFERENCES `uscite_cocchi`(`id`) ON DELETE CASCADE,
  INDEX `recurring_uscita_index` (`uscita_id`),
  INDEX `recurring_status_date_index` (`status`, `scheduled_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Occorrenze pagamenti ricorrenti';

-- 4. Tabella per analytics cache (performance optimization)
CREATE TABLE IF NOT EXISTS `uscite_analytics_cache` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `period_type` ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `crm_code` VARCHAR(50) NULL,
  `team_member_id` BIGINT UNSIGNED NULL COMMENT 'FK a users',
  `expense_type` VARCHAR(100) NULL,
  `total_amount` DECIMAL(15, 2) DEFAULT 0,
  `count` INT DEFAULT 0,
  `avg_amount` DECIMAL(15, 2) DEFAULT 0,
  `min_amount` DECIMAL(15, 2) DEFAULT 0,
  `max_amount` DECIMAL(15, 2) DEFAULT 0,
  `metadata` JSON NULL COMMENT 'Dati aggiuntivi (top categories, trends, etc)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `analytics_unique` (`period_type`, `period_start`, `period_end`, `crm_code`, `team_member_id`, `expense_type`),
  INDEX `analytics_period_index` (`period_type`, `period_start`, `period_end`),
  FOREIGN KEY (`team_member_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cache per analytics (aggiornata ogni notte)';

-- 5. Aggiungi FK constraint per crm_code (opzionale - se esiste tabella crm_departments)
-- UNCOMMENT se hai crm_departments table:
-- ALTER TABLE `uscite_cocchi`
-- ADD CONSTRAINT `uscite_cocchi_crm_code_foreign` 
-- FOREIGN KEY (`crm_code`) REFERENCES `crm_departments`(`code`) ON DELETE SET NULL;

-- 6. Verifica modifiche
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'uscite_cocchi' 
AND COLUMN_NAME IN ('crm_code', 'payment_frequency', 'next_payment_date', 'auto_renew', 'payment_method', 'is_recurring')
ORDER BY ORDINAL_POSITION;

-- 7. Test query - controlla se tutto funziona
SELECT COUNT(*) as total_uscite FROM uscite_cocchi;
SELECT COUNT(*) as total_recurring FROM uscite_cocchi_recurring;
SELECT COUNT(*) as total_analytics FROM uscite_analytics_cache;
