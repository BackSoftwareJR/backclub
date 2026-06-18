-- Aggiungi campo payment_option alla tabella quote_items
ALTER TABLE `quote_items`
ADD COLUMN `payment_option` LONGTEXT DEFAULT NULL
COMMENT 'JSON: opzione di pagamento selezionata per questo item (type, label, installments, etc.)'
AFTER `total`,
ADD COLUMN `notes` TEXT DEFAULT NULL
COMMENT 'Note aggiuntive per questo item'
AFTER `payment_option`;

