-- Aggiungi campo region alla tabella leads
-- Esegui questo script per aggiungere il campo region alla tabella leads esistente

ALTER TABLE `leads`
  ADD COLUMN `region` VARCHAR(255) DEFAULT NULL COMMENT 'Regione di appartenenza del lead' AFTER `address`,
  ADD INDEX `idx_region` (`region`);

