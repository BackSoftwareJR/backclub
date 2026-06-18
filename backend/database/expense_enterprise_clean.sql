-- ============================================================
-- EXPENSE MANAGEMENT ENTERPRISE - Schema Pulito Senza Errori
-- Ordine corretto delle tabelle per evitare errori FK
-- ============================================================

-- ============================================================
-- PARTE 1: TABELLE BASE (senza FK esterne)
-- ============================================================

-- 1. EXPENSE CATEGORIES (Prima perché indipendente)
CREATE TABLE IF NOT EXISTS `expense_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `parent_id` BIGINT UNSIGNED NULL COMMENT 'Categoria padre per gerarchia',
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `icon` VARCHAR(50) DEFAULT 'DollarSign',
  `color` VARCHAR(7) DEFAULT '#0A84FF',
  `budget_monthly` DECIMAL(15, 2) NULL,
  `budget_yearly` DECIMAL(15, 2) NULL,
  `requires_approval` TINYINT(1) DEFAULT 0,
  `approval_threshold` DECIMAL(10, 2) NULL,
  `auto_approve_under` DECIMAL(10, 2) NULL,
  `accounting_code` VARCHAR(50) NULL,
  `tax_deductible` TINYINT(1) DEFAULT 0,
  `vat_rate` DECIMAL(5, 2) DEFAULT 22.00,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_system` TINYINT(1) DEFAULT 0,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `cat_parent_idx` (`parent_id`),
  INDEX `cat_code_idx` (`code`),
  INDEX `cat_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aggiungi FK parent_id dopo creazione tabella
ALTER TABLE `expense_categories`
ADD CONSTRAINT `fk_expense_categories_parent` 
FOREIGN KEY (`parent_id`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL;

-- 2. VENDORS (Fornitori - indipendente)
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `business_name` VARCHAR(255) NULL,
  `vat_number` VARCHAR(50) NULL,
  `tax_code` VARCHAR(50) NULL,
  `sdi_code` VARCHAR(7) NULL,
  `pec` VARCHAR(255) NULL,
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `mobile` VARCHAR(50),
  `website` VARCHAR(500),
  `address` TEXT,
  `city` VARCHAR(100),
  `province` VARCHAR(2),
  `postal_code` VARCHAR(20),
  `country` VARCHAR(2) DEFAULT 'IT',
  `iban` VARCHAR(34),
  `swift` VARCHAR(11),
  `bank_name` VARCHAR(255),
  `contact_person` VARCHAR(255),
  `contact_role` VARCHAR(100),
  `contact_email` VARCHAR(255),
  `contact_phone` VARCHAR(50),
  `contract_url` VARCHAR(500),
  `contract_number` VARCHAR(100),
  `contract_start` DATE,
  `contract_end` DATE,
  `contract_auto_renew` TINYINT(1) DEFAULT 0,
  `payment_terms_days` INT DEFAULT 30,
  `payment_method_preferred` VARCHAR(100),
  `discount_percentage` DECIMAL(5, 2) DEFAULT 0,
  `total_spent` DECIMAL(15, 2) DEFAULT 0,
  `total_invoices` INT DEFAULT 0,
  `last_payment_date` DATE,
  `average_invoice_amount` DECIMAL(15, 2) DEFAULT 0,
  `rating` DECIMAL(3, 2) NULL,
  `reliability_score` TINYINT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_favorite` TINYINT(1) DEFAULT 0,
  `requires_invoice` TINYINT(1) DEFAULT 1,
  `is_intra_eu` TINYINT(1) DEFAULT 0,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PAYMENT METHODS (Prima di subscription_plans)
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('contanti', 'bonifico', 'carta_credito', 'carta_debito', 'paypal', 'stripe', 'revolut', 'altro') NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `card_holder` VARCHAR(255) NULL,
  `card_last_4` VARCHAR(4) NULL,
  `card_brand` VARCHAR(50) NULL,
  `card_expiry_month` TINYINT NULL,
  `card_expiry_year` SMALLINT NULL,
  `card_type` ENUM('credito', 'debito', 'prepagata') NULL,
  `bank_name` VARCHAR(255) NULL,
  `iban` VARCHAR(34) NULL,
  `swift` VARCHAR(11) NULL,
  `account_holder` VARCHAR(255) NULL,
  `wallet_email` VARCHAR(255) NULL,
  `wallet_account_id` VARCHAR(255) NULL,
  `serbatoio_id` BIGINT UNSIGNED NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_default` TINYINT(1) DEFAULT 0,
  `is_company_owned` TINYINT(1) DEFAULT 1,
  `assigned_to_user_id` BIGINT UNSIGNED NULL,
  `monthly_limit` DECIMAL(15, 2) NULL,
  `transaction_limit` DECIMAL(15, 2) NULL,
  `current_month_spent` DECIMAL(15, 2) DEFAULT 0,
  `alert_on_expiry` TINYINT(1) DEFAULT 1,
  `alert_days_before` INT DEFAULT 30,
  `expiry_alert_sent` TINYINT(1) DEFAULT 0,
  `notes` TEXT,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  INDEX `pm_type_idx` (`type`),
  INDEX `pm_active_idx` (`is_active`),
  INDEX `pm_default_idx` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PARTE 2: ESTENDI TABELLA USCITE_COCCHI
-- ============================================================

-- Aggiungi vendor_id a uscite_cocchi
ALTER TABLE `uscite_cocchi`
ADD COLUMN IF NOT EXISTS `vendor_id` BIGINT UNSIGNED NULL COMMENT 'FK a vendors' AFTER `client_id`;

-- Aggiungi indice
ALTER TABLE `uscite_cocchi`
ADD INDEX IF NOT EXISTS `uscite_vendor_idx` (`vendor_id`);

-- ============================================================
-- PARTE 3: TABELLE CON FK A USCITE_COCCHI
-- ============================================================

-- 4. EXPENSE REIMBURSEMENT REQUESTS
CREATE TABLE IF NOT EXISTS `expense_reimbursement_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `amount` DECIMAL(10, 2) NOT NULL,
  `category` VARCHAR(100),
  `expense_date` DATE NOT NULL,
  `crm_code` VARCHAR(50) NULL,
  `project_id` BIGINT UNSIGNED NULL,
  `client_id` BIGINT UNSIGNED NULL,
  `receipt_file_path` VARCHAR(500) NOT NULL,
  `receipt_file_name` VARCHAR(255),
  `additional_files` JSON NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'paid', 'cancelled') DEFAULT 'pending',
  `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by` BIGINT UNSIGNED NULL,
  `reviewed_at` TIMESTAMP NULL,
  `rejection_reason` TEXT NULL,
  `payment_notes` TEXT NULL,
  `paid_at` TIMESTAMP NULL,
  `paid_by` BIGINT UNSIGNED NULL,
  `uscita_id` BIGINT UNSIGNED NULL,
  `payment_method` VARCHAR(100) NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  INDEX `reimb_status_idx` (`status`),
  INDEX `reimb_user_idx` (`user_id`),
  INDEX `reimb_crm_idx` (`crm_code`),
  INDEX `reimb_date_idx` (`expense_date`),
  INDEX `reimb_requested_idx` (`requested_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SUBSCRIPTION PLANS (Ora payment_methods esiste)
CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uscita_id` BIGINT UNSIGNED NOT NULL,
  `service_name` VARCHAR(255) NOT NULL,
  `provider` VARCHAR(255) NULL,
  `plan_type` VARCHAR(100) NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `renewal_date` DATE NOT NULL,
  `billing_cycle` ENUM('weekly', 'monthly', 'quarterly', 'yearly') DEFAULT 'monthly',
  `auto_renew` TINYINT(1) DEFAULT 1,
  `last_renewal_date` DATE NULL,
  `card_last_4` VARCHAR(4) NULL,
  `payment_method` VARCHAR(100) NULL,
  `payment_method_id` BIGINT UNSIGNED NULL,
  `account_email` VARCHAR(255) NULL,
  `account_url` VARCHAR(500) NULL,
  `license_key` VARCHAR(500) NULL,
  `seats` INT NULL,
  `crm_code` VARCHAR(50) NULL,
  `assigned_to_user_id` BIGINT UNSIGNED NULL,
  `setup_fee` DECIMAL(10, 2) DEFAULT 0,
  `monthly_amount` DECIMAL(10, 2) NOT NULL,
  `yearly_amount` DECIMAL(10, 2) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_trial` TINYINT(1) DEFAULT 0,
  `trial_ends_at` DATE NULL,
  `reminder_sent` TINYINT(1) DEFAULT 0,
  `notes` TEXT,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  INDEX `subs_service_idx` (`service_name`),
  INDEX `subs_renewal_idx` (`renewal_date`),
  INDEX `subs_active_idx` (`is_active`),
  INDEX `subs_crm_idx` (`crm_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. EXPENSE DOCUMENTS (Polymorphic)
CREATE TABLE IF NOT EXISTS `expense_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `documentable_type` VARCHAR(255) NOT NULL,
  `documentable_id` BIGINT UNSIGNED NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_type` VARCHAR(100) NULL,
  `file_size` BIGINT NULL,
  `mime_type` VARCHAR(100),
  `document_type` ENUM('invoice', 'receipt', 'contract', 'quote', 'other') DEFAULT 'invoice',
  `description` TEXT,
  `ocr_text` TEXT NULL,
  `extracted_amount` DECIMAL(10, 2) NULL,
  `extracted_date` DATE NULL,
  `extracted_vendor` VARCHAR(255) NULL,
  `metadata` JSON NULL,
  `uploaded_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `docs_polymorphic_idx` (`documentable_type`, `documentable_id`),
  INDEX `docs_type_idx` (`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. EXPENSE APPROVALS (Polymorphic)
CREATE TABLE IF NOT EXISTS `expense_approvals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `approvable_type` VARCHAR(255) NOT NULL,
  `approvable_id` BIGINT UNSIGNED NOT NULL,
  `step` TINYINT NOT NULL DEFAULT 1,
  `approver_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'skipped') DEFAULT 'pending',
  `approved_at` TIMESTAMP NULL,
  `rejection_reason` TEXT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `approvals_polymorphic_idx` (`approvable_type`, `approvable_id`),
  INDEX `approvals_approver_idx` (`approver_id`),
  INDEX `approvals_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. EXPENSE AUDIT LOG
CREATE TABLE IF NOT EXISTS `expense_audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditable_type` VARCHAR(255) NOT NULL,
  `auditable_id` BIGINT UNSIGNED NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `audit_polymorphic_idx` (`auditable_type`, `auditable_id`),
  INDEX `audit_user_idx` (`user_id`),
  INDEX `audit_action_idx` (`action`),
  INDEX `audit_created_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PARTE 4: FOREIGN KEYS (Aggiunte alla fine)
-- ============================================================

-- FK Payment Methods
ALTER TABLE `payment_methods`
ADD CONSTRAINT `fk_payment_methods_serbatoio` 
FOREIGN KEY (`serbatoio_id`) REFERENCES `serbatoi`(`id`) ON DELETE SET NULL;

ALTER TABLE `payment_methods`
ADD CONSTRAINT `fk_payment_methods_user` 
FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- FK Reimbursement Requests
ALTER TABLE `expense_reimbursement_requests`
ADD CONSTRAINT `fk_reimb_user` 
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;

ALTER TABLE `expense_reimbursement_requests`
ADD CONSTRAINT `fk_reimb_reviewed_by` 
FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `expense_reimbursement_requests`
ADD CONSTRAINT `fk_reimb_paid_by` 
FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `expense_reimbursement_requests`
ADD CONSTRAINT `fk_reimb_uscita` 
FOREIGN KEY (`uscita_id`) REFERENCES `uscite_cocchi`(`id`) ON DELETE SET NULL;

ALTER TABLE `expense_reimbursement_requests`
ADD CONSTRAINT `fk_reimb_project` 
FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL;

ALTER TABLE `expense_reimbursement_requests`
ADD CONSTRAINT `fk_reimb_client` 
FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL;

-- FK Subscription Plans
ALTER TABLE `subscription_plans`
ADD CONSTRAINT `fk_subs_uscita` 
FOREIGN KEY (`uscita_id`) REFERENCES `uscite_cocchi`(`id`) ON DELETE CASCADE;

ALTER TABLE `subscription_plans`
ADD CONSTRAINT `fk_subs_user` 
FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `subscription_plans`
ADD CONSTRAINT `fk_subs_payment_method` 
FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL;

-- FK Expense Documents
ALTER TABLE `expense_documents`
ADD CONSTRAINT `fk_docs_uploaded_by` 
FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- FK Expense Approvals
ALTER TABLE `expense_approvals`
ADD CONSTRAINT `fk_approvals_approver` 
FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;

-- FK Expense Audit Log
ALTER TABLE `expense_audit_log`
ADD CONSTRAINT `fk_audit_user` 
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- FK Uscite Cocchi Vendor
ALTER TABLE `uscite_cocchi`
ADD CONSTRAINT `fk_uscite_vendor` 
FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL;

-- ============================================================
-- PARTE 5: SEEDING CATEGORIE PREDEFINITE
-- ============================================================

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

-- ============================================================
-- PARTE 6: VIEWS PER ANALYTICS
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

-- Vista: Abbonamenti Attivi con Dettagli
CREATE OR REPLACE VIEW `v_active_subscriptions` AS
SELECT 
    s.id,
    s.service_name,
    s.provider,
    s.plan_type,
    s.monthly_amount,
    s.renewal_date,
    s.billing_cycle,
    s.auto_renew,
    s.crm_code,
    u.title as expense_title,
    u.amount as current_amount,
    u.status as expense_status,
    DATEDIFF(s.renewal_date, CURDATE()) as days_until_renewal,
    CASE 
        WHEN DATEDIFF(s.renewal_date, CURDATE()) <= 7 THEN 'urgent'
        WHEN DATEDIFF(s.renewal_date, CURDATE()) <= 30 THEN 'soon'
        ELSE 'ok'
    END as renewal_urgency
FROM subscription_plans s
INNER JOIN uscite_cocchi u ON s.uscita_id = u.id
WHERE s.is_active = 1
  AND s.deleted_at IS NULL
  AND u.deleted_at IS NULL
ORDER BY s.renewal_date ASC;

-- Vista: Rimborsi Pending con Dettagli
CREATE OR REPLACE VIEW `v_pending_reimbursements` AS
SELECT 
    r.id,
    r.title,
    r.amount,
    r.expense_date,
    r.category,
    r.crm_code,
    r.requested_at,
    u.name as requester_name,
    u.email as requester_email,
    r.receipt_file_path,
    DATEDIFF(CURDATE(), r.requested_at) as days_pending,
    CASE 
        WHEN DATEDIFF(CURDATE(), r.requested_at) > 7 THEN 'overdue'
        WHEN DATEDIFF(CURDATE(), r.requested_at) > 3 THEN 'urgent'
        ELSE 'normal'
    END as urgency_level
FROM expense_reimbursement_requests r
INNER JOIN users u ON r.user_id = u.id
WHERE r.status = 'pending'
  AND r.deleted_at IS NULL
ORDER BY r.requested_at ASC;

-- Vista: Metodi Pagamento con Scadenze
CREATE OR REPLACE VIEW `v_payment_methods_expiring` AS
SELECT 
    id,
    type,
    name,
    card_brand,
    card_last_4,
    card_expiry_month,
    card_expiry_year,
    CONCAT(card_expiry_year, '-', LPAD(card_expiry_month, 2, '0'), '-01') as expiry_date,
    DATEDIFF(
        CONCAT(card_expiry_year, '-', LPAD(card_expiry_month, 2, '0'), '-01'),
        CURDATE()
    ) as days_until_expiry,
    is_active,
    is_default
FROM payment_methods
WHERE type IN ('carta_credito', 'carta_debito')
  AND card_expiry_month IS NOT NULL
  AND card_expiry_year IS NOT NULL
  AND is_active = 1
  AND deleted_at IS NULL
HAVING days_until_expiry <= 90
ORDER BY days_until_expiry ASC;

-- ============================================================
-- FINE SCHEMA - TUTTO PULITO E FUNZIONANTE
-- ============================================================

