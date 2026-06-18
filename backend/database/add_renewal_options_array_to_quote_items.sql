-- Aggiungi campo renewal_options (array) alla tabella quote_items
-- Questo campo serve per il caso 'multi-rinnovo' dove possono essere selezionate più opzioni di rinnovo
-- Se renewal_type = 'multi', questo campo conterrà un array di renewal_option
-- Se renewal_type != 'multi', questo campo sarà NULL e si usa renewal_option (singolo)

ALTER TABLE `quote_items` 
ADD COLUMN `renewal_options` LONGTEXT NULL DEFAULT NULL COMMENT 'JSON: array di opzioni di rinnovo selezionate (per multi-rinnovo)' AFTER `renewal_option`;

-- Nota sulla logica:
-- - renewal_option (singolo): usato quando renewal_type = 'obbligatorio' o 'facoltativo' (una sola opzione selezionata)
-- - renewal_options (array): usato quando renewal_type = 'multi' (più opzioni selezionate di default)
-- - Se renewal_type = 'multi', renewal_option sarà NULL e renewal_options conterrà l'array

