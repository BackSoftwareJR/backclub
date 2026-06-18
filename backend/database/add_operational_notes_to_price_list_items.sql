-- Aggiungi campo note operative alla tabella price_list_items
-- Questo campo contiene note operative per il prodotto/servizio che vengono mostrate nel preventivo

ALTER TABLE `price_list_items` 
ADD COLUMN `operational_notes` TEXT NULL DEFAULT NULL COMMENT 'Note operative per il prodotto/servizio (mostrate nel preventivo)' AFTER `description`;

