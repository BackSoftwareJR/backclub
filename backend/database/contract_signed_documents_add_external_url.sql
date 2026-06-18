-- Aggiunta colonna per URL esterno (es. Google Drive)
ALTER TABLE `contract_signed_documents`
ADD COLUMN `external_url` VARCHAR(500) DEFAULT NULL COMMENT 'URL esterno del documento (es. Google Drive)';

-- Modifica file_path per essere nullable quando c'è external_url
ALTER TABLE `contract_signed_documents`
MODIFY COLUMN `file_path` VARCHAR(500) DEFAULT NULL COMMENT 'Path file documento (null se external_url è presente)';

