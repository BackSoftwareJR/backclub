-- ============================================================
-- GESTIONE CLIENTI - Schema SQL (MySQL Compatible)
-- Eseguire questo script per creare le tabelle necessarie
-- ============================================================

-- 1. Tabella Prezzi Speciali per Clienti
CREATE TABLE IF NOT EXISTS `client_special_prices` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `service_id` bigint(20) UNSIGNED NOT NULL,
  `price` decimal(10,2) NOT NULL COMMENT 'Prezzo speciale per il cliente',
  `original_price` decimal(10,2) NOT NULL COMMENT 'Prezzo originale del servizio',
  `discount_percentage` decimal(5,2) DEFAULT 0.00 COMMENT 'Percentuale di sconto',
  `is_active` tinyint(1) DEFAULT 1,
  `valid_from` date DEFAULT NULL COMMENT 'Data inizio validità',
  `valid_until` date DEFAULT NULL COMMENT 'Data fine validità',
  `notes` text DEFAULT NULL COMMENT 'Note aggiuntive',
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_client_service_price` (`client_id`, `service_id`),
  KEY `client_special_prices_client_id_index` (`client_id`),
  KEY `client_special_prices_service_id_index` (`service_id`),
  KEY `client_special_prices_is_active_index` (`is_active`),
  KEY `client_special_prices_valid_from_valid_until_index` (`valid_from`, `valid_until`),
  CONSTRAINT `client_special_prices_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_special_prices_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `price_list_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_special_prices_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabella Offerte Promozionali
CREATE TABLE IF NOT EXISTS `client_offers` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT 'Titolo offerta',
  `description` text NOT NULL COMMENT 'Descrizione offerta',
  `discount_percentage` decimal(5,2) NOT NULL COMMENT 'Percentuale di sconto',
  `service_ids` json DEFAULT NULL COMMENT 'Array di ID servizi inclusi nell\'offerta',
  `client_ids` json DEFAULT NULL COMMENT 'Array di ID clienti a cui è riservata l\'offerta (null = tutti)',
  `valid_from` date NOT NULL COMMENT 'Data inizio validità',
  `valid_until` date NOT NULL COMMENT 'Data fine validità',
  `is_active` tinyint(1) DEFAULT 1,
  `image_url` varchar(500) DEFAULT NULL COMMENT 'URL immagine promozionale',
  `terms_conditions` text DEFAULT NULL COMMENT 'Termini e condizioni',
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_offers_is_active_index` (`is_active`),
  KEY `client_offers_valid_from_valid_until_index` (`valid_from`, `valid_until`),
  CONSTRAINT `client_offers_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabella Notizie Web
CREATE TABLE IF NOT EXISTS `web_news_articles` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT 'Titolo articolo',
  `content` text NOT NULL COMMENT 'Contenuto completo articolo',
  `excerpt` text DEFAULT NULL COMMENT 'Estratto/riassunto',
  `image_url` varchar(500) DEFAULT NULL COMMENT 'URL immagine principale',
  `author` varchar(255) NOT NULL COMMENT 'Autore articolo',
  `category` varchar(100) DEFAULT 'generale' COMMENT 'Categoria notizia',
  `is_published` tinyint(1) DEFAULT 0,
  `published_at` timestamp NULL DEFAULT NULL COMMENT 'Data pubblicazione',
  `tags` json DEFAULT NULL COMMENT 'Tag articolo',
  `views_count` int(11) DEFAULT 0 COMMENT 'Numero visualizzazioni',
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `web_news_articles_is_published_index` (`is_published`),
  KEY `web_news_articles_category_index` (`category`),
  KEY `web_news_articles_published_at_index` (`published_at`),
  CONSTRAINT `web_news_articles_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Aggiungi campo is_visible_to_clients a price_list_items
-- Verifica se la colonna esiste prima di aggiungerla (MySQL 5.7+)
SET @dbname = DATABASE();
SET @tablename = 'price_list_items';
SET @columnname = 'is_visible_to_clients';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' tinyint(1) DEFAULT 0 COMMENT \'Visibile ai clienti nell\\\'e-commerce\' AFTER `is_active`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 5. Tabella Ordini Clienti
CREATE TABLE IF NOT EXISTS `client_orders` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number` varchar(255) NOT NULL COMMENT 'Numero ordine univoco',
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('pending','confirmed','processing','completed','cancelled') DEFAULT 'pending',
  `total_amount` decimal(10,2) NOT NULL COMMENT 'Importo totale ordine',
  `discount_amount` decimal(10,2) DEFAULT 0.00 COMMENT 'Importo sconto applicato',
  `final_amount` decimal(10,2) NOT NULL COMMENT 'Importo finale dopo sconti',
  `items` json NOT NULL COMMENT 'Array JSON con i prodotti/servizi ordinati',
  `notes` text DEFAULT NULL COMMENT 'Note ordine',
  `order_date` date NOT NULL COMMENT 'Data ordine',
  `delivery_date` date DEFAULT NULL COMMENT 'Data consegna prevista',
  `payment_method` varchar(50) DEFAULT NULL COMMENT 'Metodo di pagamento',
  `payment_status` enum('pending','partial','paid','refunded') DEFAULT 'pending',
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_orders_order_number_unique` (`order_number`),
  KEY `client_orders_client_id_index` (`client_id`),
  KEY `client_orders_status_index` (`status`),
  KEY `client_orders_order_date_index` (`order_date`),
  KEY `client_orders_payment_status_index` (`payment_status`),
  CONSTRAINT `client_orders_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_orders_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabella Regali Clienti
CREATE TABLE IF NOT EXISTS `client_gifts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT 'Titolo regalo',
  `description` text NOT NULL COMMENT 'Descrizione regalo',
  `gift_type` enum('discount','service','credit','custom') DEFAULT 'discount' COMMENT 'Tipo regalo',
  `discount_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Percentuale sconto (se tipo discount)',
  `credit_amount` decimal(10,2) DEFAULT NULL COMMENT 'Importo credito (se tipo credit)',
  `service_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Servizio incluso (se tipo service)',
  `client_ids` json NOT NULL COMMENT 'Array di ID clienti destinatari',
  `valid_from` date NOT NULL COMMENT 'Data inizio validità',
  `valid_until` date NOT NULL COMMENT 'Data fine validità',
  `email_subject` text DEFAULT NULL COMMENT 'Oggetto email',
  `email_body` text DEFAULT NULL COMMENT 'Corpo email (HTML)',
  `email_status` enum('draft','scheduled','sent','failed') DEFAULT 'draft' COMMENT 'Stato invio email',
  `email_sent_at` timestamp NULL DEFAULT NULL COMMENT 'Data invio email',
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_gifts_gift_type_index` (`gift_type`),
  KEY `client_gifts_is_active_index` (`is_active`),
  KEY `client_gifts_valid_from_valid_until_index` (`valid_from`, `valid_until`),
  KEY `client_gifts_email_status_index` (`email_status`),
  CONSTRAINT `client_gifts_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `price_list_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `client_gifts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Aggiungi campi e-commerce a client_orders
SET @dbname = DATABASE();
SET @tablename = 'client_orders';
SET @columnname = 'order_source';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' enum(\'dal_sito\',\'referral\',\'cliente_diretto\') DEFAULT \'cliente_diretto\' COMMENT \'Origine ordine\' AFTER `client_id`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'project_info';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' json DEFAULT NULL COMMENT \'JSON con info progetto\' AFTER `items`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'quote_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' bigint(20) UNSIGNED DEFAULT NULL COMMENT \'FK a quotes\' AFTER `project_info`, ADD INDEX `client_orders_quote_id_index` (`quote_id`), ADD CONSTRAINT `client_orders_quote_id_foreign` FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'sent_to_sellers';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' tinyint(1) DEFAULT 0 COMMENT \'Indica se è stato inviato ai venditori\' AFTER `quote_id`, ADD INDEX `client_orders_sent_to_sellers_index` (`sent_to_sellers`)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'referral_user_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' bigint(20) UNSIGNED DEFAULT NULL COMMENT \'FK a users se ordine da referral\' AFTER `sent_to_sellers`, ADD INDEX `client_orders_referral_user_id_index` (`referral_user_id`), ADD CONSTRAINT `client_orders_referral_user_id_foreign` FOREIGN KEY (`referral_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'order_source';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX `client_orders_order_source_index` (`order_source`)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================
-- Fine script
-- ============================================================

