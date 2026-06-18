-- Aggiungi campo renewal_type alla tabella price_list_items
-- Questo campo definisce il tipo di rinnovo a livello di prodotto:
-- 'obbligatorio': il venditore DEVE selezionare una opzione (se ce n'è solo una, è selezionata automaticamente)
-- 'facoltativo': il venditore può scegliere se selezionare o no
-- 'multi': tutte le opzioni sono selezionate di default e il cliente può scegliere quale fare di mese in mese

ALTER TABLE `price_list_items` 
ADD COLUMN `renewal_type` ENUM('obbligatorio', 'facoltativo', 'multi') NULL DEFAULT NULL COMMENT 'Tipo di rinnovo: obbligatorio, facoltativo o multi-rinnovo' AFTER `renewal_options`;

-- Nota: La struttura JSON di renewal_options rimane invariata, ma ora viene interpretata in base a renewal_type:
-- - Se renewal_type = 'obbligatorio' e c'è solo 1 opzione: selezionata automaticamente
-- - Se renewal_type = 'obbligatorio' e ci sono più opzioni: il venditore deve selezionarne una
-- - Se renewal_type = 'facoltativo': il venditore può scegliere se selezionare o no
-- - Se renewal_type = 'multi': tutte le opzioni sono selezionate di default (array di renewal_option nel quote_item)

