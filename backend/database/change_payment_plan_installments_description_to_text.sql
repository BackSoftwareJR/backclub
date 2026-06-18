-- Cambia la colonna description da VARCHAR(255) a TEXT per permettere descrizioni più lunghe
-- Questo risolve l'errore "Data too long for column 'description'"

ALTER TABLE `payment_plan_installments` 
MODIFY COLUMN `description` TEXT NULL;

