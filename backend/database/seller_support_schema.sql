-- ============================================================
-- SELLER SUPPORT SYSTEM - SCHEMA DATABASE
-- Data creazione: 2026-01-XX
-- ============================================================

-- Tabella Messaggi Supporto Venditori
CREATE TABLE `seller_support_messages` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `seller_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a sellers',
  `user_id` BIGINT UNSIGNED NULL COMMENT 'Support staff user_id (FK a users)',
  `message` TEXT NOT NULL COMMENT 'Contenuto messaggio',
  `sender_type` ENUM('seller', 'support') NOT NULL COMMENT 'Tipo mittente',
  `attachments` JSON NULL COMMENT 'Array allegati [{name, url, type}]',
  `read_at` DATETIME NULL COMMENT 'Data lettura messaggio',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_seller` (`seller_id`),
  INDEX `idx_created` (`created_at`),
  INDEX `idx_read` (`read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Messaggi supporto venditori';

-- Tabella FAQ Supporto
CREATE TABLE `support_faq` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `category` VARCHAR(100) NOT NULL COMMENT 'Categoria FAQ',
  `question` TEXT NOT NULL COMMENT 'Domanda',
  `answer` TEXT NOT NULL COMMENT 'Risposta',
  `order` INT DEFAULT 0 COMMENT 'Ordine visualizzazione',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT 'FAQ attiva',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_category` (`category`),
  INDEX `idx_active` (`is_active`),
  INDEX `idx_order` (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='FAQ supporto venditori';

-- ============================================================
-- SELLER SUPPORT TICKETS - Segnalazioni venditori (Admin/Tecnico)
-- ============================================================

CREATE TABLE IF NOT EXISTS `seller_support_tickets` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `seller_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a sellers',
  `recipient_type` ENUM('admin', 'tecnico') NOT NULL COMMENT 'Destinatario: Amministrazione o Tecnico',
  `subject` VARCHAR(255) NULL COMMENT 'Oggetto (opzionale)',
  `message` TEXT NOT NULL COMMENT 'Testo richiesta',
  `category` VARCHAR(50) NULL COMMENT 'amministrazione|sales-kit|contrattualistica|tecnico|sicurezza (per filtri admin)',
  `status` ENUM('aperto', 'in_lavorazione', 'risolto', 'chiuso') NOT NULL DEFAULT 'aperto',
  `priority` ENUM('bassa', 'media', 'alta', 'urgente') NOT NULL DEFAULT 'media',
  `assigned_to` BIGINT UNSIGNED NULL COMMENT 'FK users - operatore assegnato',
  `response` TEXT NULL COMMENT 'Risposta del supporto',
  `response_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_seller` (`seller_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_recipient` (`recipient_type`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ticket supporto venditori';

