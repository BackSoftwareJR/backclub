-- ============================================================
-- FIX: Aggiorna ENUM type in serbatoio_transactions
-- ============================================================
-- Problema: 'allocation_to_crm' non è tra i valori permessi
-- Soluzione: Aggiorna ENUM per includere tutti i tipi necessari

ALTER TABLE `serbatoio_transactions` 
MODIFY COLUMN `type` ENUM(
    'auto_income',
    'manual_transfer_in',
    'manual_transfer_out',
    'expense',
    'adjustment',
    'allocation_to_crm',
    'income_distribution'
) NOT NULL;

-- Verifica
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'serbatoio_transactions' 
AND COLUMN_NAME = 'type';

