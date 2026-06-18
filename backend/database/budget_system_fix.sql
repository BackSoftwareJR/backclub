-- ============================================================
-- BUDGET SYSTEM FIX - Schema Updates
-- ============================================================

-- 1. Extend crm_expenses table with document fields
ALTER TABLE `crm_expenses`
ADD COLUMN `document_type` ENUM('ricevuta', 'fattura', 'altro') NULL AFTER `type`,
ADD COLUMN `document_number` VARCHAR(100) NULL AFTER `document_type`,
ADD COLUMN `document_file` VARCHAR(500) NULL AFTER `document_number`,
ADD COLUMN `vendor` VARCHAR(255) NULL AFTER `category`,
ADD COLUMN `paid_at` DATE NULL AFTER `end_date`,
ADD COLUMN `reduces_serbatoio` TINYINT(1) DEFAULT 1 COMMENT 'Se 1, riduce il serbatoio Budget' AFTER `status`;

-- 2. Create budget_allocations table
CREATE TABLE IF NOT EXISTS `budget_allocations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `crm_department_id` BIGINT UNSIGNED NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `allocated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `allocated_by` BIGINT UNSIGNED NOT NULL,
  `reason` TEXT NULL,
  `status` ENUM('active', 'revoked') DEFAULT 'active',
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `budget_allocations_crm_id_index` (`crm_department_id`),
  INDEX `budget_allocations_status_index` (`status`),
  FOREIGN KEY (`crm_department_id`) REFERENCES `crm_departments` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`allocated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Add index to serbatoio_transactions for better performance
ALTER TABLE `serbatoio_transactions`
ADD INDEX `serbatoio_transactions_type_index` (`type`);
