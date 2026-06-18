-- Aggiungi campo selected_features alla tabella quote_items per salvare le caratteristiche selezionate
ALTER TABLE `quote_items` 
ADD COLUMN `selected_features` LONGTEXT NULL DEFAULT NULL COMMENT 'JSON: array di caratteristiche selezionate per questo item' AFTER `renewal_option`;

