-- ============================================================
-- SISTEMA GESTIONALE VENDITORI - SCHEMA DATABASE COMPLETO
-- Data creazione: 2026-01-04
-- ============================================================

-- Tabella Venditori (Anagrafica)
-- Estende la tabella users con role='venditori'
CREATE TABLE `sellers` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE COMMENT 'FK a users con role venditori',
  `contract_file` VARCHAR(500) DEFAULT NULL COMMENT 'Path file contratto',
  `contract_start_date` DATE DEFAULT NULL COMMENT 'Data inizio contratto',
  `contract_end_date` DATE DEFAULT NULL COMMENT 'Data scadenza contratto',
  `territory` LONGTEXT DEFAULT NULL COMMENT 'JSON array province/regioni di competenza',
  `commission_rate` DECIMAL(5,2) DEFAULT 10.00 COMMENT 'Percentuale provvigione (%)',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Venditore attivo',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Anagrafica venditori';

-- Tabella Settori Assegnati ai Venditori (Many-to-Many)
CREATE TABLE `seller_departments` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `seller_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a sellers',
  `crm_department_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a crm_departments',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Settore attivo per venditore',
  `currently_working` TINYINT(1) DEFAULT 0 COMMENT 'Settore in cui sta lavorando ora (max 1 per venditore)',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`crm_department_id`) REFERENCES `crm_departments`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_seller_department` (`seller_id`, `crm_department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Settori assegnati ai venditori';

-- Tabella Listino Prodotti/Servizi
CREATE TABLE `price_list_items` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `crm_department_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a crm_departments (settore)',
  `name` VARCHAR(255) NOT NULL COMMENT 'Nome prodotto/servizio',
  `description` TEXT DEFAULT NULL COMMENT 'Descrizione dettagliata',
  `landing_page_url` VARCHAR(500) DEFAULT NULL COMMENT 'URL landing page spiegazione',
  `base_price` DECIMAL(10,2) NOT NULL COMMENT 'Prezzo base',
  `price_type` ENUM('fisso','variabile','personalizzato') DEFAULT 'fisso' COMMENT 'Tipologia prezzo',
  `payment_options` LONGTEXT DEFAULT NULL COMMENT 'JSON: opzioni pagamento (rate, tantum, 30/40/30, ecc)',
  `min_installment_amount` DECIMAL(10,2) DEFAULT NULL COMMENT 'Importo minimo rata',
  `max_installments` INT DEFAULT NULL COMMENT 'Numero massimo rate',
  `margin_percentage` DECIMAL(5,2) DEFAULT NULL COMMENT 'Margine percentuale',
  `features` LONGTEXT DEFAULT NULL COMMENT 'JSON: caratteristiche prodotto',
  `renewal_options` LONGTEXT DEFAULT NULL COMMENT 'JSON: opzioni di rinnovo (durata, prezzo, cosa comprende)',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Prodotto attivo',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`crm_department_id`) REFERENCES `crm_departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Listino prodotti e servizi';

-- Tabella Preventivi
CREATE TABLE `quotes` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `quote_number` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Numero preventivo univoco',
  `client_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a clients',
  `seller_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a sellers',
  `crm_department_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a crm_departments (settore)',
  `status` ENUM('pending','approved','rejected','started','completed') DEFAULT 'pending' COMMENT 'Stato preventivo',
  `title` VARCHAR(255) NOT NULL COMMENT 'Titolo preventivo',
  `description` TEXT DEFAULT NULL COMMENT 'Descrizione',
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Subtotale voci',
  `discount_percentage` DECIMAL(5,2) DEFAULT 0 COMMENT 'Sconto percentuale',
  `discount_amount` DECIMAL(10,2) DEFAULT 0 COMMENT 'Sconto importo fisso',
  `tax_percentage` DECIMAL(5,2) DEFAULT 22.00 COMMENT 'IVA percentuale',
  `tax_amount` DECIMAL(10,2) DEFAULT 0 COMMENT 'IVA importo',
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Totale finale',
  `notes` TEXT DEFAULT NULL COMMENT 'Note e condizioni',
  `valid_until` DATE DEFAULT NULL COMMENT 'Validità preventivo',
  `pdf_path` VARCHAR(500) DEFAULT NULL COMMENT 'Path PDF generato',
  `created_by` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a users (creatore)',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`crm_department_id`) REFERENCES `crm_departments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_quote_number` (`quote_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_seller` (`seller_id`),
  INDEX `idx_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Preventivi';

-- Tabella Voci Preventivo
CREATE TABLE `quote_items` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a quotes',
  `price_list_item_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a price_list_items (opzionale)',
  `description` TEXT NOT NULL COMMENT 'Descrizione voce',
  `quantity` DECIMAL(10,2) DEFAULT 1 COMMENT 'Quantità',
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT 'Prezzo unitario',
  `discount` DECIMAL(5,2) DEFAULT 0 COMMENT 'Sconto percentuale voce',
  `total` DECIMAL(10,2) NOT NULL COMMENT 'Totale voce',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`price_list_item_id`) REFERENCES `price_list_items`(`id`) ON DELETE SET NULL,
  INDEX `idx_quote` (`quote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Voci preventivo';

-- Tabella Contratti Clienti
CREATE TABLE `contracts` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `contract_number` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Numero contratto univoco',
  `quote_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a quotes (se deriva da preventivo)',
  `client_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a clients',
  `seller_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a sellers',
  `crm_project_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a crm_projects (progetto collegato)',
  `status` ENUM('draft','active','suspended','completed','terminated') DEFAULT 'draft' COMMENT 'Stato contratto',
  `title` VARCHAR(255) NOT NULL COMMENT 'Titolo contratto',
  `contract_type` VARCHAR(100) DEFAULT NULL COMMENT 'Tipologia contratto',
  `start_date` DATE DEFAULT NULL COMMENT 'Data inizio',
  `end_date` DATE DEFAULT NULL COMMENT 'Data fine',
  `total_value` DECIMAL(10,2) DEFAULT NULL COMMENT 'Valore totale contratto',
  `payment_terms` TEXT DEFAULT NULL COMMENT 'Termini di pagamento',
  `contract_file` VARCHAR(500) DEFAULT NULL COMMENT 'Path file contratto',
  `signed_file` VARCHAR(500) DEFAULT NULL COMMENT 'Path contratto firmato',
  `signed_at` DATETIME DEFAULT NULL COMMENT 'Data e ora firma',
  `notes` TEXT DEFAULT NULL COMMENT 'Note',
  `created_by` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a users (creatore)',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`crm_project_id`) REFERENCES `crm_projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_contract_number` (`contract_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_seller` (`seller_id`),
  INDEX `idx_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contratti clienti';

-- Tabella Leads (Contatti da Chiamare)
CREATE TABLE `leads` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `assigned_seller_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a sellers (venditore assegnato)',
  `company_name` VARCHAR(255) NOT NULL COMMENT 'Ragione sociale',
  `contact_person` VARCHAR(255) DEFAULT NULL COMMENT 'Persona di contatto',
  `phones` LONGTEXT DEFAULT NULL COMMENT 'JSON array: [{number, label, isPrimary}]',
  `emails` LONGTEXT DEFAULT NULL COMMENT 'JSON array: [{email, label, isPrimary}]',
  `crm_department_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a crm_departments (settore)',
  `websites` LONGTEXT DEFAULT NULL COMMENT 'JSON array: urls siti web',
  `description` TEXT DEFAULT NULL COMMENT 'Descrizione cliente/contatto',
  `status` ENUM('new','contacted','qualified','proposal','negotiation','won','lost') DEFAULT 'new' COMMENT 'Stato lead',
  `priority` ENUM('low','medium','high','urgent') DEFAULT 'medium' COMMENT 'Priorità',
  `estimated_value` DECIMAL(10,2) DEFAULT NULL COMMENT 'Valore stimato opportunità',
  `expected_close_date` DATE DEFAULT NULL COMMENT 'Data chiusura prevista',
  `source` VARCHAR(100) DEFAULT NULL COMMENT 'Origine lead (website, referral, cold_call, etc)',
  `last_contact_date` DATE DEFAULT NULL COMMENT 'Data ultimo contatto',
  `next_followup_date` DATE DEFAULT NULL COMMENT 'Data prossimo follow-up',
  `notes` TEXT DEFAULT NULL COMMENT 'Note generali',
  `converted_to_client_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a clients (se convertito)',
  `created_by` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a users (creatore)',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`assigned_seller_id`) REFERENCES `sellers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`crm_department_id`) REFERENCES `crm_departments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`converted_to_client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_status` (`status`),
  INDEX `idx_seller` (`assigned_seller_id`),
  INDEX `idx_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Leads - Contatti da chiamare';

-- Tabella Log Attività Leads
CREATE TABLE `lead_activities` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `lead_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a leads',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a users (chi ha fatto attività)',
  `activity_type` ENUM('call','email','meeting','note','status_change') NOT NULL COMMENT 'Tipo attività',
  `description` TEXT DEFAULT NULL COMMENT 'Descrizione attività',
  `outcome` VARCHAR(255) DEFAULT NULL COMMENT 'Esito attività',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_lead` (`lead_id`),
  INDEX `idx_activity_type` (`activity_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log attività leads';

-- ============================================================
-- MODIFICHE TABELLE ESISTENTI
-- ============================================================

-- Aggiunge campo seller_id alla tabella clients
ALTER TABLE `clients` 
  ADD COLUMN `seller_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a sellers (venditore che ha portato il cliente)' AFTER `id`,
  ADD FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE SET NULL;

-- Aggiunge campo seller_id alla tabella crm_projects
ALTER TABLE `crm_projects` 
  ADD COLUMN `seller_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a sellers (venditore associato al progetto)' AFTER `manager_id`,
  ADD FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE SET NULL;

-- ============================================================
-- INDICI AGGIUNTIVI PER PERFORMANCE
-- ============================================================

-- Indici per ricerche frequenti
CREATE INDEX `idx_seller_active` ON `sellers`(`is_active`);
CREATE INDEX `idx_price_list_department` ON `price_list_items`(`crm_department_id`, `is_active`);
CREATE INDEX `idx_quote_date` ON `quotes`(`created_at`);
CREATE INDEX `idx_contract_dates` ON `contracts`(`start_date`, `end_date`);
CREATE INDEX `idx_lead_followup` ON `leads`(`next_followup_date`);
CREATE INDEX `idx_lead_created` ON `leads`(`created_at`);

-- ============================================================
-- VISTE UTILI
-- ============================================================

-- Vista riepilogativa venditori con statistiche
CREATE OR REPLACE VIEW `sellers_summary` AS
SELECT 
  s.id,
  s.user_id,
  u.name AS seller_name,
  u.email AS seller_email,
  s.is_active,
  s.commission_rate,
  s.contract_end_date,
  COUNT(DISTINCT c.id) AS total_clients,
  COUNT(DISTINCT q.id) AS total_quotes,
  COUNT(DISTINCT ct.id) AS total_contracts,
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT p.id) AS total_projects,
  COALESCE(SUM(CASE WHEN ct.status = 'active' THEN ct.total_value ELSE 0 END), 0) AS active_contracts_value
FROM sellers s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN clients c ON c.seller_id = s.id
LEFT JOIN quotes q ON q.seller_id = s.id
LEFT JOIN contracts ct ON ct.seller_id = s.id
LEFT JOIN leads l ON l.assigned_seller_id = s.id
LEFT JOIN crm_projects p ON p.seller_id = s.id
GROUP BY s.id, s.user_id, u.name, u.email, s.is_active, s.commission_rate, s.contract_end_date;

-- Vista preventivi con dettagli
CREATE OR REPLACE VIEW `quotes_detailed` AS
SELECT 
  q.*,
  c.company_name AS client_name,
  u.name AS seller_name,
  d.name AS department_name,
  d.color AS department_color,
  COUNT(qi.id) AS items_count,
  creator.name AS created_by_name
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
LEFT JOIN sellers s ON q.seller_id = s.id
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN crm_departments d ON q.crm_department_id = d.id
LEFT JOIN quote_items qi ON qi.quote_id = q.id
LEFT JOIN users creator ON q.created_by = creator.id
GROUP BY q.id;

-- Vista contratti con dettagli
CREATE OR REPLACE VIEW `contracts_detailed` AS
SELECT 
  ct.*,
  c.company_name AS client_name,
  c.email AS client_email,
  u.name AS seller_name,
  p.name AS project_name,
  p.status AS project_status,
  d.name AS department_name,
  creator.name AS created_by_name
FROM contracts ct
LEFT JOIN clients c ON ct.client_id = c.id
LEFT JOIN sellers s ON ct.seller_id = s.id
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN crm_projects p ON ct.crm_project_id = p.id
LEFT JOIN crm_departments d ON p.manager_id = d.id
LEFT JOIN users creator ON ct.created_by = creator.id;

-- Vista leads con dettagli
CREATE OR REPLACE VIEW `leads_detailed` AS
SELECT 
  l.*,
  u.name AS seller_name,
  d.name AS department_name,
  d.color AS department_color,
  c.company_name AS converted_client_name,
  creator.name AS created_by_name,
  (SELECT COUNT(*) FROM lead_activities WHERE lead_id = l.id) AS activities_count
FROM leads l
LEFT JOIN sellers s ON l.assigned_seller_id = s.id
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN crm_departments d ON l.crm_department_id = d.id
LEFT JOIN clients c ON l.converted_to_client_id = c.id
LEFT JOIN users creator ON l.created_by = creator.id;

-- ============================================================
-- FINE SCHEMA
-- ============================================================

