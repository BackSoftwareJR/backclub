-- Aggiungi campi per documento informativo e scheda tecnica alla tabella price_list_items

ALTER TABLE `price_list_items` 
ADD COLUMN `technical_sheet_url` VARCHAR(500) NULL COMMENT 'URL scheda tecnica' AFTER `landing_page_url`,
ADD COLUMN `informative_document_path` VARCHAR(500) NULL COMMENT 'Path documento informativo PDF' AFTER `technical_sheet_url`;
