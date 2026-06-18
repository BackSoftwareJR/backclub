-- ============================================================
-- GESTIONE CLIENTI - Schema SQL
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
ALTER TABLE `price_list_items` 
ADD COLUMN IF NOT EXISTS `is_visible_to_clients` tinyint(1) DEFAULT 0 COMMENT 'Visibile ai clienti nell\'e-commerce' AFTER `is_active`;

-- ============================================================
-- Fine script
-- ============================================================

