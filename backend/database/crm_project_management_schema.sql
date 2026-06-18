-- ============================================================
-- CRM PROJECT MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================================

-- 1. PROJECT TYPES / TEMPLATES
CREATE TABLE IF NOT EXISTS `project_types` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `required_fields` JSON NULL COMMENT 'Campi richiesti per questo tipo',
  `default_duration_days` INT NULL,
  `icon` VARCHAR(50) NULL,
  `color` VARCHAR(7) DEFAULT '#0A84FF',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `project_types_code_index` (`code`),
  INDEX `project_types_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default project types
INSERT INTO `project_types` (`code`, `name`, `description`, `icon`, `color`, `default_duration_days`, `created_at`, `updated_at`) 
VALUES
('SITO_WEB', 'Sito Web', 'Sviluppo sito web aziendale o e-commerce', 'Globe', '#FF2D55', 60, NOW(), NOW()),
('APP_MOBILE', 'App Mobile', 'Sviluppo applicazione mobile iOS/Android', 'Smartphone', '#0A84FF', 90, NOW(), NOW()),
('GESTIONALE', 'Gestionale', 'Sistema gestionale personalizzato', 'Database', '#AF52DE', 120, NOW(), NOW()),
('MARKETING', 'Campagna Marketing', 'Campagna pubblicitaria e marketing', 'BarChart3', '#30D158', 30, NOW(), NOW()),
('BRANDING', 'Branding', 'Design logo e identità aziendale', 'Palette', '#FF9F0A', 45, NOW(), NOW()),
('VIDEO', 'Produzione Video', 'Video promozionali e contenuti multimediali', 'Video', '#FF9F0A', 30, NOW(), NOW()),
('FORMAZIONE', 'Formazione', 'Corso di formazione e training', 'BookOpen', '#00C7BE', 15, NOW(), NOW()),
('CONSULENZA', 'Consulenza', 'Servizio di consulenza strategica', 'UserCheck', '#FF6482', 30, NOW(), NOW()),
('ALTRO', 'Altro', 'Progetto personalizzato', 'FileText', '#8E8E93', NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. EXTEND CLIENTS TABLE
ALTER TABLE `clients` 
ADD COLUMN IF NOT EXISTS `referente_nome` VARCHAR(255) NULL AFTER `name`,
ADD COLUMN IF NOT EXISTS `referente_cognome` VARCHAR(255) NULL AFTER `referente_nome`,
ADD COLUMN IF NOT EXISTS `referente_telefono` VARCHAR(50) NULL AFTER `referente_cognome`,
ADD COLUMN IF NOT EXISTS `referente_email` VARCHAR(255) NULL AFTER `referente_telefono`,
ADD COLUMN IF NOT EXISTS `partita_iva` VARCHAR(50) NULL AFTER `referente_email`,
ADD COLUMN IF NOT EXISTS `ragione_sociale` VARCHAR(255) NULL AFTER `partita_iva`,
ADD COLUMN IF NOT EXISTS `visura_camerale_url` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `visura_camerale_reminder` TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS `visura_uploaded_at` TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS `iban` VARCHAR(34) NULL,
ADD COLUMN IF NOT EXISTS `swift` VARCHAR(11) NULL,
ADD COLUMN IF NOT EXISTS `sdi_code` VARCHAR(7) NULL,
ADD COLUMN IF NOT EXISTS `pec` VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS `sito_web` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `drive_link_foto` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `drive_link_video` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `drive_link_materiali` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `facebook_profile` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `google_ads_account` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `google_my_business` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `privacy_sheet_url` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `carta_servizi_url` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `carta_identita_url` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `codice_fiscale` VARCHAR(16) NULL;

-- 3. EXTEND PROJECTS TABLE
ALTER TABLE `projects`
ADD COLUMN IF NOT EXISTS `project_type_id` BIGINT UNSIGNED NULL AFTER `id`,
ADD COLUMN IF NOT EXISTS `client_id` BIGINT UNSIGNED NULL AFTER `project_type_id`,
ADD COLUMN IF NOT EXISTS `crm_department_id` BIGINT UNSIGNED NULL AFTER `client_id`,
ADD COLUMN IF NOT EXISTS `project_template` VARCHAR(255) NULL COMMENT 'Se tipo "altro"',
ADD COLUMN IF NOT EXISTS `contratto_url` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `link_foto_video` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `link_cartella_documenti` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `link_cartella_social` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `link_cartella_credenziali` VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS `budget_allocated` DECIMAL(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS `budget_spent` DECIMAL(15, 2) DEFAULT 0.00;

-- Add foreign keys if they don't exist
ALTER TABLE `projects`
ADD CONSTRAINT `fk_projects_project_type` FOREIGN KEY IF NOT EXISTS (`project_type_id`) REFERENCES `project_types` (`id`) ON DELETE SET NULL,
ADD CONSTRAINT `fk_projects_client` FOREIGN KEY IF NOT EXISTS (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
ADD CONSTRAINT `fk_projects_crm_department` FOREIGN KEY IF NOT EXISTS (`crm_department_id`) REFERENCES `crm_departments` (`id`) ON DELETE SET NULL;

-- 4. PROJECT TEAM MEMBERS
CREATE TABLE IF NOT EXISTS `project_team_members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `project_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role` VARCHAR(100) NULL,
  `payment_type` ENUM('fisso', 'orario', 'percentuale', 'cocchi') DEFAULT 'fisso',
  `payment_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  UNIQUE KEY `unique_project_user` (`project_id`, `user_id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. PROJECT PURCHASES
CREATE TABLE IF NOT EXISTS `project_purchases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `project_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `category` VARCHAR(100) NULL,
  `purchase_date` DATE NOT NULL,
  `vendor` VARCHAR(255) NULL,
  `invoice_url` VARCHAR(500) NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `project_purchases_project_id_index` (`project_id`),
  INDEX `project_purchases_purchase_date_index` (`purchase_date`),
  FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. PROJECT RESOURCES
CREATE TABLE IF NOT EXISTS `project_resources` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `project_id` BIGINT UNSIGNED NOT NULL,
  `type` ENUM('link', 'file', 'credential', 'other') DEFAULT 'link',
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `url` VARCHAR(500) NULL,
  `username` VARCHAR(255) NULL,
  `password` TEXT NULL COMMENT 'Encrypted',
  `notes` TEXT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `project_resources_project_id_index` (`project_id`),
  INDEX `project_resources_type_index` (`type`),
  FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. PROJECT CHAT MESSAGES
CREATE TABLE IF NOT EXISTS `project_chat_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `project_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `message` TEXT NOT NULL,
  `is_pm_chat` TINYINT(1) DEFAULT 0 COMMENT '1=PM chat, 0=General chat',
  `parent_message_id` BIGINT UNSIGNED NULL COMMENT 'For thread replies',
  `attachments` JSON NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `project_chat_project_id_index` (`project_id`),
  INDEX `project_chat_user_id_index` (`user_id`),
  INDEX `project_chat_created_at_index` (`created_at`),
  FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parent_message_id`) REFERENCES `project_chat_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. PROJECT CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS `project_calendar_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `project_id` BIGINT UNSIGNED NULL,
  `crm_department_id` BIGINT UNSIGNED NULL,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Creator',
  `type` ENUM('task', 'event', 'call', 'meeting', 'document') DEFAULT 'event',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `start_datetime` DATETIME NOT NULL,
  `end_datetime` DATETIME NULL,
  `all_day` TINYINT(1) DEFAULT 0,
  `location` VARCHAR(255) NULL,
  `participants` JSON NULL COMMENT 'Array of user IDs',
  `attachments` JSON NULL,
  `status` ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned',
  `reminder_minutes` INT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `calendar_project_id_index` (`project_id`),
  INDEX `calendar_crm_id_index` (`crm_department_id`),
  INDEX `calendar_start_datetime_index` (`start_datetime`),
  INDEX `calendar_type_index` (`type`),
  FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`crm_department_id`) REFERENCES `crm_departments` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. CLIENT DOCUMENT REMINDERS
CREATE TABLE IF NOT EXISTS `client_document_reminders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `document_type` VARCHAR(100) NOT NULL,
  `reminder_frequency` ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
  `last_reminded_at` TIMESTAMP NULL,
  `is_completed` TINYINT(1) DEFAULT 0,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `client_reminders_client_id_index` (`client_id`),
  INDEX `client_reminders_is_completed_index` (`is_completed`),
  FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
