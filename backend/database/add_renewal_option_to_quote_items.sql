-- Aggiungi campo renewal_option alla tabella quote_items per salvare i rinnovi selezionati
ALTER TABLE `quote_items` 
ADD COLUMN `renewal_option` LONGTEXT NULL DEFAULT NULL COMMENT 'JSON: opzione di rinnovo selezionata con prezzo modificabile' AFTER `payment_option`,
ADD COLUMN `notes` TEXT NULL DEFAULT NULL COMMENT 'Note aggiuntive sulla voce' AFTER `renewal_option`;

