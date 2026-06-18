-- ============================================================
-- PROJECT EXPENSES AND FINANCIAL TRANSACTIONS SETUP
-- Data: 2026-01-15
-- ============================================================
-- 
-- Questo script crea:
-- 1. Tabella project_expenses per gestire spese progetto e spese utente
-- 2. Tabella financial_transactions se non esiste già
--
-- IMPORTANTE: Le spese utente sono sempre collegate al progetto tramite crm_project_id
-- ============================================================

-- ============================================================
-- 1. TABELLA PROJECT_EXPENSES
-- ============================================================
-- Gestisce sia spese di progetto che spese per utenti
-- Tutte le spese sono collegate al progetto tramite crm_project_id
CREATE TABLE IF NOT EXISTS `project_expenses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `crm_project_id` BIGINT UNSIGNED NOT NULL COMMENT 'Sempre presente: progetto a cui appartiene la spesa',
  `type` ENUM('project', 'user') NOT NULL DEFAULT 'project' COMMENT 'project = spesa progetto, user = spesa per utente (sempre collegata al progetto)',
  `user_id` BIGINT UNSIGNED NULL COMMENT 'Utente se type=user (la spesa è comunque del progetto)',
  `title` VARCHAR(255) NOT NULL COMMENT 'Titolo breve della spesa',
  `description` TEXT NULL COMMENT 'Descrizione dettagliata',
  `amount_cocchi` DECIMAL(15, 2) NOT NULL COMMENT 'Importo in cocchi',
  `expense_date` DATE NOT NULL COMMENT 'Data della spesa',
  `category` VARCHAR(100) NULL COMMENT 'Categoria spesa',
  `status` ENUM('pending', 'approved', 'rejected', 'paid') NOT NULL DEFAULT 'pending' COMMENT 'Stato approvazione',
  `approved_by` BIGINT UNSIGNED NULL COMMENT 'Chi ha approvato',
  `approved_at` TIMESTAMP NULL COMMENT 'Quando è stata approvata',
  `rejection_reason` TEXT NULL COMMENT 'Motivo rifiuto se rejected',
  `payment_method` VARCHAR(100) NULL COMMENT 'Metodo di pagamento (bonifico, paypal, carta, contanti, altro)',
  `receipt_file_path` VARCHAR(500) NULL COMMENT 'Path ricevuta/screenshot',
  `receipt_file_name` VARCHAR(255) NULL COMMENT 'Nome file ricevuta',
  `is_reimbursement_request` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Se è una richiesta di rimborso',
  `created_by` BIGINT UNSIGNED NOT NULL COMMENT 'Chi ha creato la spesa',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL COMMENT 'Soft delete',
  
  -- Foreign Keys
  FOREIGN KEY (`crm_project_id`) REFERENCES `crm_projects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  
  -- Indici per performance
  INDEX `idx_project_expenses_project` (`crm_project_id`),
  INDEX `idx_project_expenses_type` (`type`),
  INDEX `idx_project_expenses_user` (`user_id`),
  INDEX `idx_project_expenses_status` (`status`),
  INDEX `idx_project_expenses_date` (`expense_date`),
  INDEX `idx_project_expenses_reimbursement` (`is_reimbursement_request`),
  INDEX `idx_project_expenses_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Spese progetto e spese utente (sempre collegate al progetto)';

-- ============================================================
-- 2. TABELLA FINANCIAL_TRANSACTIONS (se non esiste)
-- ============================================================
-- Gestisce transazioni finanziarie (entrate/uscite) del progetto
CREATE TABLE IF NOT EXISTS `financial_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('entrata', 'uscita') NOT NULL COMMENT 'Tipo transazione',
  `amount_cocchi` DECIMAL(10, 2) NOT NULL COMMENT 'Importo in cocchi',
  `description` TEXT NULL COMMENT 'Descrizione transazione',
  `category` VARCHAR(100) NULL COMMENT 'Categoria',
  `project_id` BIGINT UNSIGNED NULL COMMENT 'Progetto (FK a crm_projects)',
  `client_id` BIGINT UNSIGNED NULL COMMENT 'Cliente',
  `user_id` BIGINT UNSIGNED NULL COMMENT 'Utente che ha registrato la transazione',
  `transaction_date` DATE NOT NULL COMMENT 'Data transazione',
  `reference_number` VARCHAR(100) NULL COMMENT 'Numero riferimento',
  `document_path` VARCHAR(255) NULL COMMENT 'Path documento',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys (solo se le tabelle esistono)
  -- FOREIGN KEY (`project_id`) REFERENCES `crm_projects` (`id`) ON DELETE SET NULL,
  -- FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  -- FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  
  -- Indici
  INDEX `idx_financial_transactions_project` (`project_id`),
  INDEX `idx_financial_transactions_client` (`client_id`),
  INDEX `idx_financial_transactions_user` (`user_id`),
  INDEX `idx_financial_transactions_type` (`type`),
  INDEX `idx_financial_transactions_date` (`transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Transazioni finanziarie progetti';

-- Aggiungi Foreign Keys solo se le tabelle esistono
-- Verifica e aggiungi FK per project_id
SET @db_name = DATABASE();
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = @db_name 
    AND table_name = 'crm_projects'
);

SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.table_constraints 
    WHERE table_schema = @db_name 
    AND table_name = 'financial_transactions' 
    AND constraint_name = 'financial_transactions_project_id_foreign'
);

SET @sql = IF(@table_exists > 0 AND @fk_exists = 0, 
    'ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `crm_projects` (`id`) ON DELETE SET NULL',
    'SELECT "FK project_id già esistente o tabella crm_projects non trovata" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verifica e aggiungi FK per client_id
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = @db_name 
    AND table_name = 'clients'
);

SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.table_constraints 
    WHERE table_schema = @db_name 
    AND table_name = 'financial_transactions' 
    AND constraint_name = 'financial_transactions_client_id_foreign'
);

SET @sql = IF(@table_exists > 0 AND @fk_exists = 0, 
    'ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL',
    'SELECT "FK client_id già esistente o tabella clients non trovata" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verifica e aggiungi FK per user_id
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = @db_name 
    AND table_name = 'users'
);

SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.table_constraints 
    WHERE table_schema = @db_name 
    AND table_name = 'financial_transactions' 
    AND constraint_name = 'financial_transactions_user_id_foreign'
);

SET @sql = IF(@table_exists > 0 AND @fk_exists = 0, 
    'ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL',
    'SELECT "FK user_id già esistente o tabella users non trovata" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- VERIFICA FINALE
-- ============================================================
SELECT 
    'project_expenses' AS table_name,
    COUNT(*) AS row_count
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'project_expenses'

UNION ALL

SELECT 
    'financial_transactions' AS table_name,
    COUNT(*) AS row_count
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'financial_transactions';

-- Mostra struttura tabelle create
SHOW CREATE TABLE `project_expenses`;
SHOW CREATE TABLE `financial_transactions`;

