-- ============================================================
-- SISTEMA DOMANDE E ANALISI COSTI PREVENTIVI
-- Data creazione: 2026-01-15
-- ============================================================

-- Tabella Domande per Listino
CREATE TABLE IF NOT EXISTS `price_list_item_questions` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `price_list_item_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a price_list_items',
  `question_text` TEXT NOT NULL COMMENT 'Testo domanda',
  `question_type` ENUM('multiple_choice', 'text', 'number') NOT NULL DEFAULT 'multiple_choice' COMMENT 'Tipo domanda',
  `is_required` TINYINT(1) DEFAULT 0 COMMENT 'Domanda obbligatoria',
  `order` INT DEFAULT 0 COMMENT 'Ordine visualizzazione',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`price_list_item_id`) REFERENCES `price_list_items`(`id`) ON DELETE CASCADE,
  INDEX `idx_price_list_item` (`price_list_item_id`),
  INDEX `idx_order` (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Domande configurabili per listino';

-- Tabella Risposte per Domande Multiple Choice
CREATE TABLE IF NOT EXISTS `question_answers` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `question_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a price_list_item_questions',
  `answer_text` VARCHAR(255) NOT NULL COMMENT 'Testo risposta',
  `order` INT DEFAULT 0 COMMENT 'Ordine visualizzazione',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`question_id`) REFERENCES `price_list_item_questions`(`id`) ON DELETE CASCADE,
  INDEX `idx_question` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Risposte per domande multiple choice';

-- Tabella Condizioni per Risposte (variazioni prezzo/costi)
CREATE TABLE IF NOT EXISTS `answer_conditions` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `answer_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a question_answers',
  `price_adjustment` DECIMAL(10,2) DEFAULT 0 COMMENT 'Variazione prezzo (può essere negativo)',
  `cost_description` TEXT DEFAULT NULL COMMENT 'Descrizione costo da aggiungere',
  `cost_amount` DECIMAL(10,2) DEFAULT 0 COMMENT 'Importo costo aggiuntivo',
  `work_description` TEXT DEFAULT NULL COMMENT 'Descrizione lavorazione per analisi costi',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`answer_id`) REFERENCES `question_answers`(`id`) ON DELETE CASCADE,
  INDEX `idx_answer` (`answer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Condizioni per risposte (variazioni prezzo/costi)';

-- Tabella Risposte Date dai Venditori
CREATE TABLE IF NOT EXISTS `quote_item_answers` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `quote_item_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a quote_items',
  `question_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a price_list_item_questions',
  `answer_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a question_answers (NULL per risposte testo)',
  `text_answer` TEXT DEFAULT NULL COMMENT 'Risposta testo libero',
  `number_answer` DECIMAL(10,2) DEFAULT NULL COMMENT 'Risposta numerica',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`quote_item_id`) REFERENCES `quote_items`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `price_list_item_questions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`answer_id`) REFERENCES `question_answers`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_quote_item_question` (`quote_item_id`, `question_id`),
  INDEX `idx_quote_item` (`quote_item_id`),
  INDEX `idx_question` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Risposte date dai venditori per ogni voce preventivo';

-- Tabella Analisi Costi (collegata a progetti)
CREATE TABLE IF NOT EXISTS `quote_cost_analysis` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a quotes (riferimento preventivo)',
  `crm_project_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a crm_projects (progetto collegato)',
  `quote_item_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a quote_items (voce preventivo)',
  `description` TEXT NOT NULL COMMENT 'Descrizione costo/lavorazione',
  `cost_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Importo costo',
  `is_auto_generated` TINYINT(1) DEFAULT 0 COMMENT 'Se generato automaticamente da condizioni',
  `work_description` TEXT DEFAULT NULL COMMENT 'Descrizione dettagliata lavorazione',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`crm_project_id`) REFERENCES `crm_projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`quote_item_id`) REFERENCES `quote_items`(`id`) ON DELETE CASCADE,
  INDEX `idx_quote` (`quote_id`),
  INDEX `idx_project` (`crm_project_id`),
  INDEX `idx_quote_item` (`quote_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Analisi costi per progetti (generata automaticamente o manuale)';

-- ============================================================
-- MODIFICHE TABELLE ESISTENTI
-- ============================================================

-- Aggiungere campi a quote_items per salvare risposte e aggiustamenti
ALTER TABLE `quote_items`
  ADD COLUMN IF NOT EXISTS `question_answers` LONGTEXT DEFAULT NULL COMMENT 'JSON: risposte date (per riferimento rapido)',
  ADD COLUMN IF NOT EXISTS `price_adjustments` DECIMAL(10,2) DEFAULT 0 COMMENT 'Totale aggiustamenti prezzo da domande';

-- ============================================================
-- INDICI AGGIUNTIVI
-- ============================================================

CREATE INDEX IF NOT EXISTS `idx_cost_analysis_project` ON `quote_cost_analysis`(`crm_project_id`, `is_auto_generated`);
CREATE INDEX IF NOT EXISTS `idx_cost_analysis_quote` ON `quote_cost_analysis`(`quote_id`, `quote_item_id`);

