-- Aggiunge lo stato 'contract_requested' all'ENUM dello status dei preventivi
ALTER TABLE `quotes` 
MODIFY COLUMN `status` ENUM('pending','approved','rejected','started','completed','contract_requested') DEFAULT 'pending' COMMENT 'Stato preventivo';

