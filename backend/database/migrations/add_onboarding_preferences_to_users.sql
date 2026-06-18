-- ============================================================
-- ONBOARDING PREFERENCES - Database Migration
-- ============================================================
-- Aggiunge i campi per le preferenze di onboarding alla tabella users
-- Questi campi permettono di salvare le preferenze dell'utente
-- (lingua, tema, stato onboarding) e sincronizzarle tra mobile e desktop

ALTER TABLE `users` 
ADD COLUMN `onboarding_completed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Indica se l''utente ha completato l''onboarding' AFTER `is_active`,
ADD COLUMN `preferred_language` VARCHAR(10) NOT NULL DEFAULT 'it' COMMENT 'Lingua preferita: it, en, es, fr' AFTER `onboarding_completed`,
ADD COLUMN `preferred_theme` VARCHAR(10) NOT NULL DEFAULT 'system' COMMENT 'Tema preferito: light, dark, system' AFTER `preferred_language`;

-- Aggiungi indici per migliorare le performance delle query
ALTER TABLE `users`
ADD INDEX `idx_onboarding_completed` (`onboarding_completed`),
ADD INDEX `idx_preferred_language` (`preferred_language`),
ADD INDEX `idx_preferred_theme` (`preferred_theme`);

-- Aggiorna gli utenti esistenti: se hanno già fatto login, considera onboarding completato
-- (opzionale: rimuovi questo UPDATE se vuoi che tutti gli utenti esistenti facciano l'onboarding)
-- UPDATE `users` SET `onboarding_completed` = 1 WHERE `last_login_at` IS NOT NULL;
