-- Aggiunge campi per sconto e motivazione alle rate del piano di pagamento
ALTER TABLE `payment_plan_installments`
ADD COLUMN `discount_amount` DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Importo sconto applicato alla rata' AFTER `amount`,
ADD COLUMN `discount_reason` TEXT NULL COMMENT 'Motivazione dello sconto' AFTER `discount_amount`,
ADD COLUMN `original_amount` DECIMAL(10, 2) NULL COMMENT 'Importo originale prima dello sconto' AFTER `discount_amount`;

-- Aggiungi indice per ricerche
ALTER TABLE `payment_plan_installments`
ADD INDEX `idx_discount_amount` (`discount_amount`);

