-- ============================================================================
-- AGGIORNAMENTO SISTEMA RINNOVI E NOTE OPERATIVE
-- ============================================================================
-- Questo script aggiunge:
-- 1. Campo "note operative" ai prodotti del listino
-- 2. Campo "renewal_type" per gestire rinnovo obbligatorio/facoltativo/multi
-- 3. Campo "renewal_options" (array) ai quote_items per multi-rinnovo
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Aggiungi campo note operative alla tabella price_list_items
-- ----------------------------------------------------------------------------
ALTER TABLE `price_list_items` 
ADD COLUMN `operational_notes` TEXT NULL DEFAULT NULL 
COMMENT 'Note operative per il prodotto/servizio (mostrate nel preventivo)' 
AFTER `description`;

-- ----------------------------------------------------------------------------
-- 2. Aggiungi campo renewal_type alla tabella price_list_items
-- ----------------------------------------------------------------------------
ALTER TABLE `price_list_items` 
ADD COLUMN `renewal_type` ENUM('obbligatorio', 'facoltativo', 'multi') NULL DEFAULT NULL 
COMMENT 'Tipo di rinnovo: obbligatorio (deve selezionare), facoltativo (può selezionare), multi (tutte selezionate di default)' 
AFTER `renewal_options`;

-- ----------------------------------------------------------------------------
-- 3. Aggiungi campo renewal_options (array) alla tabella quote_items
-- ----------------------------------------------------------------------------
ALTER TABLE `quote_items` 
ADD COLUMN `renewal_options` LONGTEXT NULL DEFAULT NULL 
COMMENT 'JSON: array di opzioni di rinnovo selezionate (per multi-rinnovo). Se renewal_type=multi, contiene array; altrimenti NULL e si usa renewal_option' 
AFTER `renewal_option`;

-- ============================================================================
-- NOTE IMPORTANTI:
-- ============================================================================
-- 
-- LOGICA RINNOVI:
-- 
-- 1. renewal_type = 'obbligatorio':
--    - Se c'è solo 1 opzione: selezionata automaticamente (non può essere deselezionata)
--    - Se ci sono più opzioni: il venditore DEVE selezionarne una
--    - Salvato in quote_items.renewal_option (singolo)
--
-- 2. renewal_type = 'facoltativo':
--    - Il venditore può scegliere se selezionare o no
--    - Se c'è solo 1 opzione: disponibile ma non selezionata di default
--    - Se ci sono più opzioni: il venditore può selezionarne una o nessuna
--    - Salvato in quote_items.renewal_option (singolo)
--
-- 3. renewal_type = 'multi':
--    - Tutte le opzioni sono selezionate di default
--    - Il venditore può deselezionare alcune opzioni
--    - Il cliente può scegliere quale opzione attivare di mese in mese
--    - Salvato in quote_items.renewal_options (array JSON)
--    - quote_items.renewal_option sarà NULL
--
-- ESEMPIO JSON per renewal_options (multi-rinnovo):
-- [
--   {
--     "id": "1767528702617",
--     "duration": "monthly",
--     "price": 260,
--     "description": "Rinnovo con gestione",
--     "includes": ["Manutenzione", "Backup"],
--     "is_active": true
--   },
--   {
--     "id": "1767528901968",
--     "duration": "monthly",
--     "price": 80,
--     "description": "Rinnovo base",
--     "includes": ["Manutenzione base"],
--     "is_active": true
--   }
-- ]
--
-- ============================================================================

