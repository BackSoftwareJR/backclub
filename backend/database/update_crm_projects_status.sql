-- Aggiorna lo status ENUM per crm_projects con i nuovi stati
ALTER TABLE `crm_projects`
MODIFY COLUMN `status` ENUM(
    'in_attesa_presa_carico',
    'preso_in_carico', 
    'avviato',
    'active',
    'paused',
    'completed',
    'archived'
) NOT NULL DEFAULT 'in_attesa_presa_carico' COMMENT 'Stato del progetto';

-- Aggiorna i progetti esistenti creati da contratti a 'in_attesa_presa_carico' se hanno settings con created_from = 'contract'
UPDATE `crm_projects`
SET `status` = 'in_attesa_presa_carico'
WHERE JSON_EXTRACT(`settings`, '$.created_from') = 'contract'
AND `status` = 'active';

