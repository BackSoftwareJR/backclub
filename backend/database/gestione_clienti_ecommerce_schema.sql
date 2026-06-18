-- ============================================================
-- GESTIONE CLIENTI E-COMMERCE - Schema SQL
-- Eseguire questo script per aggiungere i campi e-commerce
-- ============================================================

-- Aggiungi campi e-commerce a client_orders
ALTER TABLE `client_orders` 
ADD COLUMN IF NOT EXISTS `order_source` enum('dal_sito','referral','cliente_diretto') DEFAULT 'cliente_diretto' COMMENT 'Origine ordine: dal sito e-commerce, referral, o inserito manualmente' AFTER `client_id`,
ADD COLUMN IF NOT EXISTS `project_info` json DEFAULT NULL COMMENT 'JSON con info progetto: idee, ispirazioni, obiettivi, note cliente' AFTER `items`,
ADD COLUMN IF NOT EXISTS `quote_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK a quotes quando inviato a venditori' AFTER `project_info`,
ADD COLUMN IF NOT EXISTS `sent_to_sellers` tinyint(1) DEFAULT 0 COMMENT 'Indica se è stato inviato ai venditori come preventivo' AFTER `quote_id`,
ADD COLUMN IF NOT EXISTS `referral_user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK a users se ordine da referral' AFTER `sent_to_sellers`;

-- Aggiungi indici e foreign keys
ALTER TABLE `client_orders`
ADD INDEX IF NOT EXISTS `client_orders_order_source_index` (`order_source`),
ADD INDEX IF NOT EXISTS `client_orders_quote_id_index` (`quote_id`),
ADD INDEX IF NOT EXISTS `client_orders_sent_to_sellers_index` (`sent_to_sellers`),
ADD INDEX IF NOT EXISTS `client_orders_referral_user_id_index` (`referral_user_id`);

-- Aggiungi foreign keys (se non esistono già)
SET @dbname = DATABASE();
SET @fk_name = 'client_orders_quote_id_foreign';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = 'client_orders')
      AND (CONSTRAINT_NAME = @fk_name)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE client_orders ADD CONSTRAINT ', @fk_name, ' FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @fk_name = 'client_orders_referral_user_id_foreign';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = 'client_orders')
      AND (CONSTRAINT_NAME = @fk_name)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE client_orders ADD CONSTRAINT ', @fk_name, ' FOREIGN KEY (`referral_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================
-- Fine script
-- ============================================================

