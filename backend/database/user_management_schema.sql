-- ============================================================
-- ADVANCED USERS MANAGEMENT SYSTEM - Database Schema
-- ============================================================

-- 1. Tabella ore lavorate
CREATE TABLE IF NOT EXISTS `user_work_hours` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a users',
  `project_id` BIGINT UNSIGNED NULL COMMENT 'FK a projects (opzionale)',
  `date` DATE NOT NULL COMMENT 'Data lavoro',
  `hours` DECIMAL(5, 2) NOT NULL COMMENT 'Ore lavorate',
  `hourly_rate` DECIMAL(10, 2) NULL COMMENT 'Tariffa oraria applicata',
  `description` TEXT NULL COMMENT 'Descrizione attività',
  `approved_by` BIGINT UNSIGNED NULL COMMENT 'FK a users (chi ha approvato)',
  `approved_at` TIMESTAMP NULL COMMENT 'Data approvazione',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `work_hours_user_index` (`user_id`, `date`),
  INDEX `work_hours_project_index` (`project_id`),
  INDEX `work_hours_date_index` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ore lavorate utenti';

-- 2. Tabella compensi
CREATE TABLE IF NOT EXISTS `user_compensation` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a users',
  `type` ENUM('hourly', 'task', 'project') NOT NULL COMMENT 'Tipo retribuzione',
  `base_rate` DECIMAL(10, 2) NOT NULL COMMENT 'Tariffa base',
  `effective_from` DATE NOT NULL COMMENT 'Valido da',
  `effective_to` DATE NULL COMMENT 'Valido fino a',
  `notes` TEXT NULL COMMENT 'Note aggiuntive',
  `created_by` BIGINT UNSIGNED NOT NULL COMMENT 'FK a users (chi ha creato)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `compensation_user_index` (`user_id`),
  INDEX `compensation_dates_index` (`effective_from`, `effective_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Compensi utenti';

-- 3. Tabella note utente
CREATE TABLE IF NOT EXISTS `user_notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a users (utente a cui si riferisce)',
  `note` TEXT NOT NULL COMMENT 'Contenuto nota',
  `created_by` BIGINT UNSIGNED NOT NULL COMMENT 'FK a users (autore)',
  `is_private` TINYINT(1) DEFAULT 0 COMMENT 'Visibile solo admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `notes_user_index` (`user_id`),
  INDEX `notes_created_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Note utenti';

-- 4. Verifica tabelle create
SELECT 
    TABLE_NAME, 
    TABLE_ROWS,
    CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('user_work_hours', 'user_compensation', 'user_notes');
