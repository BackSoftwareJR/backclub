-- Estensione tabella leads per supportare importazione CSV e campi aggiuntivi
-- Esegui questo script per aggiungere i nuovi campi alla tabella leads esistente

ALTER TABLE `leads`
  ADD COLUMN `tipologia` VARCHAR(100) DEFAULT NULL COMMENT 'Tipologia lead (es. Azienda, Privato, etc)' AFTER `company_name`,
  ADD COLUMN `address` TEXT DEFAULT NULL COMMENT 'Indirizzo completo' AFTER `contact_person`,
  ADD COLUMN `digital_status` TEXT DEFAULT NULL COMMENT 'Stato Digitale Attuale' AFTER `description`,
  ADD COLUMN `pitch_strategy` TEXT DEFAULT NULL COMMENT 'Strategia di Pitch & Opportunità' AFTER `digital_status`,
  ADD COLUMN `referral_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK a users (utente che ha fatto referral)' AFTER `created_by`,
  ADD INDEX `idx_source` (`source`),
  ADD INDEX `idx_referral_user` (`referral_user_id`),
  ADD FOREIGN KEY (`referral_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;

