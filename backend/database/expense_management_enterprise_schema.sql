-- ============================================================
-- EXPENSE MANAGEMENT ENTERPRISE SYSTEM - Database Schema
-- Sistema completo gestione spese, rimborsi, abbonamenti
-- ============================================================

-- 1. EXPENSE REIMBURSEMENT REQUESTS (Richieste Rimborsi)
CREATE TABLE IF NOT EXISTS `expense_reimbursement_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Richiedente',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `amount` DECIMAL(10, 2) NOT NULL,
  `category` VARCHAR(100),
  `expense_date` DATE NOT NULL COMMENT 'Data spesa effettiva',
  
  -- Collegamenti
  `crm_code` VARCHAR(50) NULL,
  `project_id` BIGINT UNSIGNED NULL,
  `client_id` BIGINT UNSIGNED NULL,
  
  -- Documenti
  `receipt_file_path` VARCHAR(500) NOT NULL COMMENT 'Ricevuta obbligatoria',
  `receipt_file_name` VARCHAR(255),
  `additional_files` JSON NULL COMMENT 'Altri allegati',
  
  -- Workflow
  `status` ENUM('pending', 'approved', 'rejected', 'paid', 'cancelled') DEFAULT 'pending',
  `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by` BIGINT UNSIGNED NULL COMMENT 'Chi ha approvato/rifiutato',
  `reviewed_at` TIMESTAMP NULL,
  `rejection_reason` TEXT NULL,
  `payment_notes` TEXT NULL,
  `paid_at` TIMESTAMP NULL,
  `paid_by` BIGINT UNSIGNED NULL COMMENT 'Chi ha pagato',
  `uscita_id` BIGINT UNSIGNED NULL COMMENT 'FK a uscite_cocchi quando pagato',
  
  -- Metadati
  `payment_method` VARCHAR(100) NULL COMMENT 'Come è stato pagato',
  `metadata` JSON NULL COMMENT 'Dati aggiuntivi',
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`uscita_id`) REFERENCES `uscite_cocchi`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
  
  INDEX `reimb_status_idx` (`status`),
  INDEX `reimb_user_idx` (`user_id`),
  INDEX `reimb_crm_idx` (`crm_code`),
  INDEX `reimb_date_idx` (`expense_date`),
  INDEX `reimb_requested_idx` (`requested_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Richieste rimborsi spese con workflow approvazione';

-- 2. SUBSCRIPTION PLANS (Abbonamenti)
CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uscita_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a uscite_cocchi (master record)',
  
  -- Identificazione
  `service_name` VARCHAR(255) NOT NULL COMMENT 'Nome servizio (es: AWS, Mailchimp)',
  `provider` VARCHAR(255) NULL COMMENT 'Fornitore',
  `plan_type` VARCHAR(100) NULL COMMENT 'Tipo piano (Basic, Pro, Enterprise)',
  
  -- Ciclo di vita
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL COMMENT 'NULL = fino a cancellazione',
  `renewal_date` DATE NOT NULL COMMENT 'Prossimo rinnovo',
  `billing_cycle` ENUM('weekly', 'monthly', 'quarterly', 'yearly') DEFAULT 'monthly',
  `auto_renew` TINYINT(1) DEFAULT 1,
  `last_renewal_date` DATE NULL,
  
  -- Pagamento
  `card_last_4` VARCHAR(4) NULL,
  `payment_method` VARCHAR(100) NULL COMMENT 'Carta, PayPal, Bonifico',
  `payment_method_id` BIGINT UNSIGNED NULL COMMENT 'FK a payment_methods',
  
  -- Account
  `account_email` VARCHAR(255) NULL,
  `account_url` VARCHAR(500) NULL,
  `license_key` VARCHAR(500) NULL,
  `seats` INT NULL COMMENT 'Numero licenze/posti',
  
  -- Collegamenti
  `crm_code` VARCHAR(50) NULL,
  `assigned_to_user_id` BIGINT UNSIGNED NULL COMMENT 'Responsabile',
  
  -- Costi
  `setup_fee` DECIMAL(10, 2) DEFAULT 0 COMMENT 'Costo iniziale',
  `monthly_amount` DECIMAL(10, 2) NOT NULL COMMENT 'Importo mensile',
  `yearly_amount` DECIMAL(10, 2) NULL COMMENT 'Se annuale',
  
  -- Flags
  `is_active` TINYINT(1) DEFAULT 1,
  `is_trial` TINYINT(1) DEFAULT 0,
  `trial_ends_at` DATE NULL,
  `reminder_sent` TINYINT(1) DEFAULT 0 COMMENT 'Alert rinnovo inviato',
  
  `notes` TEXT,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  
  FOREIGN KEY (`uscita_id`) REFERENCES `uscite_cocchi`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL,
  
  INDEX `subs_service_idx` (`service_name`),
  INDEX `subs_renewal_idx` (`renewal_date`),
  INDEX `subs_active_idx` (`is_active`),
  INDEX `subs_crm_idx` (`crm_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gestione abbonamenti e pagamenti ricorrenti';

-- 3. PAYMENT METHODS (Metodi di Pagamento)
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('contanti', 'bonifico', 'carta_credito', 'carta_debito', 'paypal', 'stripe', 'revolut', 'altro') NOT NULL,
  `name` VARCHAR(255) NOT NULL COMMENT 'Nome descrittivo (es: Carta Aziendale Amex)',
  `description` TEXT NULL,
  
  -- Carta
  `card_holder` VARCHAR(255) NULL,
  `card_last_4` VARCHAR(4) NULL,
  `card_brand` VARCHAR(50) NULL COMMENT 'Visa, Mastercard, Amex',
  `card_expiry_month` TINYINT NULL,
  `card_expiry_year` SMALLINT NULL,
  `card_type` ENUM('credito', 'debito', 'prepagata') NULL,
  
  -- Conto Bancario
  `bank_name` VARCHAR(255) NULL,
  `iban` VARCHAR(34) NULL,
  `swift` VARCHAR(11) NULL,
  `account_holder` VARCHAR(255) NULL,
  
  -- Wallet Digitale
  `wallet_email` VARCHAR(255) NULL COMMENT 'Email PayPal/Stripe',
  `wallet_account_id` VARCHAR(255) NULL,
  
  -- Collegamento Serbatoio
  `serbatoio_id` BIGINT UNSIGNED NULL COMMENT 'Wallet Cocchi collegato',
  
  -- Gestione
  `is_active` TINYINT(1) DEFAULT 1,
  `is_default` TINYINT(1) DEFAULT 0 COMMENT 'Metodo predefinito',
  `is_company_owned` TINYINT(1) DEFAULT 1 COMMENT 'Aziendale o personale',
  `assigned_to_user_id` BIGINT UNSIGNED NULL COMMENT 'Assegnato a utente specifico',
  
  -- Limiti
  `monthly_limit` DECIMAL(15, 2) NULL COMMENT 'Limite spesa mensile',
  `transaction_limit` DECIMAL(15, 2) NULL COMMENT 'Limite per transazione',
  `current_month_spent` DECIMAL(15, 2) DEFAULT 0,
  
  -- Alert
  `alert_on_expiry` TINYINT(1) DEFAULT 1,
  `alert_days_before` INT DEFAULT 30,
  `expiry_alert_sent` TINYINT(1) DEFAULT 0,
  
  `notes` TEXT,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  
  FOREIGN KEY (`serbatoio_id`) REFERENCES `serbatoi`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  
  INDEX `pm_type_idx` (`type`),
  INDEX `pm_active_idx` (`is_active`),
  INDEX `pm_default_idx` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Metodi di pagamento aziendali';

-- 4. EXPENSE CATEGORIES (Categorie Gerarchiche)
CREATE TABLE IF NOT EXISTS `expense_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `parent_id` BIGINT UNSIGNED NULL COMMENT 'Categoria padre per gerarchia',
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `icon` VARCHAR(50) DEFAULT 'DollarSign',
  `color` VARCHAR(7) DEFAULT '#0A84FF',
  
  -- Budget
  `budget_monthly` DECIMAL(15, 2) NULL COMMENT 'Budget mensile per categoria',
  `budget_yearly` DECIMAL(15, 2) NULL,
  
  -- Approvazione
  `requires_approval` TINYINT(1) DEFAULT 0,
  `approval_threshold` DECIMAL(10, 2) NULL COMMENT 'Importo sopra il quale serve approvazione',
  `auto_approve_under` DECIMAL(10, 2) NULL COMMENT 'Auto-approva sotto questo importo',
  
  -- Contabilità
  `accounting_code` VARCHAR(50) NULL COMMENT 'Codice piano dei conti',
  `tax_deductible` TINYINT(1) DEFAULT 0,
  `vat_rate` DECIMAL(5, 2) DEFAULT 22.00,
  
  -- Flags
  `is_active` TINYINT(1) DEFAULT 1,
  `is_system` TINYINT(1) DEFAULT 0 COMMENT 'Categoria di sistema non modificabile',
  `sort_order` INT DEFAULT 0,
  
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  
  FOREIGN KEY (`parent_id`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL,
  
  INDEX `cat_parent_idx` (`parent_id`),
  INDEX `cat_code_idx` (`code`),
  INDEX `cat_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Categorie spese gerarchiche';

-- Inserisci categorie predefinite
INSERT INTO `expense_categories` (`code`, `name`, `icon`, `color`, `is_system`, `sort_order`) VALUES
('INFRASTRUTTURA', 'Infrastruttura IT', 'Server', '#0A84FF', 1, 100),
('CLOUD', 'Cloud Services', 'Cloud', '#0A84FF', 1, 110),
('SOFTWARE', 'Software e Licenze', 'Package', '#5856D6', 1, 120),
('MARKETING', 'Marketing e Pubblicità', 'TrendingUp', '#FF2D55', 1, 200),
('ADS_ONLINE', 'Advertising Online', 'DollarSign', '#FF2D55', 1, 210),
('PERSONALE', 'Personale', 'Users', '#34C759', 1, 300),
('STIPENDI', 'Stipendi e Compensi', 'Wallet', '#34C759', 1, 310),
('RIMBORSI', 'Rimborsi Spese', 'Receipt', '#34C759', 1, 320),
('AMMINISTRATIVO', 'Amministrativo', 'FileText', '#FF9F0A', 1, 400),
('AFFITTO', 'Affitto e Canoni', 'Home', '#FF9F0A', 1, 410),
('UTENZE', 'Utenze', 'Zap', '#FF9F0A', 1, 420),
('TRASPORTI', 'Trasporti e Trasferte', 'Car', '#AF52DE', 1, 500),
('CARBURANTE', 'Carburante', 'Fuel', '#AF52DE', 1, 510),
('FORMAZIONE', 'Formazione', 'BookOpen', '#00C7BE', 1, 600),
('ALTRO', 'Altro', 'MoreHorizontal', '#8E8E93', 1, 900)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 5. VENDORS (Fornitori)
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  -- Anagrafica
  `name` VARCHAR(255) NOT NULL COMMENT 'Nome commerciale',
  `business_name` VARCHAR(255) NULL COMMENT 'Ragione sociale',
  `vat_number` VARCHAR(50) NULL COMMENT 'Partita IVA',
  `tax_code` VARCHAR(50) NULL COMMENT 'Codice fiscale',
  `sdi_code` VARCHAR(7) NULL COMMENT 'Codice SDI fatturazione elettronica',
  `pec` VARCHAR(255) NULL,
  
  -- Contatti
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `mobile` VARCHAR(50),
  `website` VARCHAR(500),
  
  -- Indirizzo
  `address` TEXT,
  `city` VARCHAR(100),
  `province` VARCHAR(2),
  `postal_code` VARCHAR(20),
  `country` VARCHAR(2) DEFAULT 'IT',
  
  -- Bancari
  `iban` VARCHAR(34),
  `swift` VARCHAR(11),
  `bank_name` VARCHAR(255),
  
  -- Contatto Principale
  `contact_person` VARCHAR(255),
  `contact_role` VARCHAR(100),
  `contact_email` VARCHAR(255),
  `contact_phone` VARCHAR(50),
  
  -- Contratto
  `contract_url` VARCHAR(500) COMMENT 'Link documento contratto',
  `contract_number` VARCHAR(100),
  `contract_start` DATE,
  `contract_end` DATE,
  `contract_auto_renew` TINYINT(1) DEFAULT 0,
  
  -- Pagamento
  `payment_terms_days` INT DEFAULT 30 COMMENT 'Giorni pagamento (es: 30gg)',
  `payment_method_preferred` VARCHAR(100),
  `discount_percentage` DECIMAL(5, 2) DEFAULT 0,
  
  -- Statistiche
  `total_spent` DECIMAL(15, 2) DEFAULT 0,
  `total_invoices` INT DEFAULT 0,
  `last_payment_date` DATE,
  `average_invoice_amount` DECIMAL(15, 2) DEFAULT 0,
  
  -- Valutazione
  `rating` DECIMAL(3, 2) NULL COMMENT 'Da 1 a 5',
  `reliability_score` TINYINT NULL COMMENT 'Da 1 a 10',
  
  -- Flags
  `is_active` TINYINT(1) DEFAULT 1,
  `is_favorite` TINYINT(1) DEFAULT 0,
  `requires_invoice` TINYINT(1) DEFAULT 1,
  `is_intra_eu` TINYINT(1) DEFAULT 0 COMMENT 'Fornitore UE',
  
  -- Alert
  `contract_expiry_alert` TINYINT(1) DEFAULT 1,
  `contract_alert_sent` TINYINT(1) DEFAULT 0,
  
  `notes` TEXT,
  `tags` JSON NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `vendors_vat_idx` (`vat_number`),
  INDEX `vendors_name_idx` (`name`),
  INDEX `vendors_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Anagrafica fornitori';

-- 6. EXPENSE_DOCUMENTS (Documenti Allegati)
CREATE TABLE IF NOT EXISTS `expense_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `documentable_type` VARCHAR(255) NOT NULL COMMENT 'Polymorphic: UscitaCocchi, ExpenseReimbursementRequest',
  `documentable_id` BIGINT UNSIGNED NOT NULL,
  
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_type` VARCHAR(100) NULL COMMENT 'application/pdf, image/jpeg',
  `file_size` BIGINT NULL COMMENT 'Bytes',
  `mime_type` VARCHAR(100),
  
  `document_type` ENUM('invoice', 'receipt', 'contract', 'quote', 'other') DEFAULT 'invoice',
  `description` TEXT,
  
  -- OCR / Metadata estratti
  `ocr_text` TEXT NULL COMMENT 'Testo estratto da OCR',
  `extracted_amount` DECIMAL(10, 2) NULL,
  `extracted_date` DATE NULL,
  `extracted_vendor` VARCHAR(255) NULL,
  `metadata` JSON NULL,
  
  `uploaded_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  
  INDEX `docs_polymorphic_idx` (`documentable_type`, `documentable_id`),
  INDEX `docs_type_idx` (`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Documenti allegati alle spese';

-- 7. EXPENSE_APPROVALS (Workflow Approvazioni)
CREATE TABLE IF NOT EXISTS `expense_approvals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `approvable_type` VARCHAR(255) NOT NULL COMMENT 'Polymorphic: UscitaCocchi, ExpenseReimbursementRequest',
  `approvable_id` BIGINT UNSIGNED NOT NULL,
  
  `step` TINYINT NOT NULL DEFAULT 1 COMMENT 'Step workflow (1, 2, 3...)',
  `approver_id` BIGINT UNSIGNED NOT NULL COMMENT 'Chi deve approvare',
  `status` ENUM('pending', 'approved', 'rejected', 'skipped') DEFAULT 'pending',
  
  `approved_at` TIMESTAMP NULL,
  `rejection_reason` TEXT NULL,
  `notes` TEXT NULL,
  
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  
  FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  
  INDEX `approvals_polymorphic_idx` (`approvable_type`, `approvable_id`),
  INDEX `approvals_approver_idx` (`approver_id`),
  INDEX `approvals_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Workflow approvazioni multi-step';

-- 8. EXPENSE_AUDIT_LOG (Audit Trail)
CREATE TABLE IF NOT EXISTS `expense_audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditable_type` VARCHAR(255) NOT NULL,
  `auditable_id` BIGINT UNSIGNED NOT NULL,
  
  `action` VARCHAR(100) NOT NULL COMMENT 'created, updated, deleted, approved, rejected, paid',
  `user_id` BIGINT UNSIGNED NULL COMMENT 'Chi ha fatto azione',
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `metadata` JSON NULL,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  
  INDEX `audit_polymorphic_idx` (`auditable_type`, `auditable_id`),
  INDEX `audit_user_idx` (`user_id`),
  INDEX `audit_action_idx` (`action`),
  INDEX `audit_created_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit log per tracciabilità';

-- ============================================================
-- VIEWS (Viste per Analytics)
-- ============================================================

-- Vista: Spese per CRM
CREATE OR REPLACE VIEW `v_expenses_by_crm` AS
SELECT 
    crm_code,
    COUNT(*) as total_count,
    SUM(amount) as total_amount,
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
    SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
    MIN(payment_date) as first_expense_date,
    MAX(payment_date) as last_expense_date,
    AVG(amount) as avg_amount
FROM uscite_cocchi
WHERE deleted_at IS NULL
  AND crm_code IS NOT NULL
GROUP BY crm_code;

-- Vista: Abbonamenti Attivi
CREATE OR REPLACE VIEW `v_active_subscriptions` AS
SELECT 
    s.*,
    u.title as expense_title,
    u.amount as current_amount,
    u.crm_code,
    DATEDIFF(s.renewal_date, CURDATE()) as days_until_renewal
FROM subscription_plans s
INNER JOIN uscite_cocchi u ON s.uscita_id = u.id
WHERE s.is_active = 1
  AND s.deleted_at IS NULL
  AND u.deleted_at IS NULL
ORDER BY s.renewal_date ASC;

-- Vista: Rimborsi Pending
CREATE OR REPLACE VIEW `v_pending_reimbursements` AS
SELECT 
    r.*,
    u.name as requester_name,
    u.email as requester_email,
    DATEDIFF(CURDATE(), r.requested_at) as days_pending
FROM expense_reimbursement_requests r
INNER JOIN users u ON r.user_id = u.id
WHERE r.status = 'pending'
  AND r.deleted_at IS NULL
ORDER BY r.requested_at ASC;

-- ============================================================
-- TRIGGERS (Automazioni)
-- ============================================================

-- Trigger: Aggiorna total_spent vendor quando pagato
DELIMITER $$
CREATE TRIGGER `update_vendor_stats_after_payment`
AFTER UPDATE ON `uscite_cocchi`
FOR EACH ROW
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.vendor_id IS NOT NULL THEN
        UPDATE vendors
        SET 
            total_spent = total_spent + NEW.amount,
            total_invoices = total_invoices + 1,
            last_payment_date = NEW.paid_at,
            average_invoice_amount = total_spent / total_invoices
        WHERE id = NEW.vendor_id;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- STORED PROCEDURES (Operazioni Complesse)
-- ============================================================

-- Procedura: Genera prossime occorrenze pagamenti ricorrenti
DELIMITER $$
CREATE PROCEDURE `generate_recurring_payments`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE uscita_id BIGINT;
    DECLARE next_date DATE;
    DECLARE billing_cycle VARCHAR(50);
    
    DECLARE cur CURSOR FOR 
        SELECT id, next_payment_date, payment_frequency 
        FROM uscite_cocchi 
        WHERE is_recurring = 1 
          AND is_active = 1
          AND next_payment_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO uscita_id, next_date, billing_cycle;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Crea nuova occorrenza in uscite_cocchi_recurring
        INSERT INTO uscite_cocchi_recurring (
            uscita_id, 
            original_amount, 
            scheduled_date, 
            status
        )
        SELECT 
            id,
            amount,
            next_payment_date,
            'scheduled'
        FROM uscite_cocchi
        WHERE id = uscita_id;
        
    END LOOP;
    
    CLOSE cur;
END$$
DELIMITER ;

-- ============================================================
-- INDEXES per Performance
-- ============================================================

-- Aggiungi vendor_id a uscite_cocchi se non esiste
ALTER TABLE `uscite_cocchi`
ADD COLUMN IF NOT EXISTS `vendor_id` BIGINT UNSIGNED NULL COMMENT 'FK a vendors' AFTER `client_id`,
ADD INDEX IF NOT EXISTS `uscite_vendor_idx` (`vendor_id`);

