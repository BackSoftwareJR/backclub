-- ============================================================
-- SCRIPT PER CREARE RECORD SELLERS MANCANTI
-- ============================================================
-- Questo script crea record nella tabella sellers per tutti gli utenti
-- con role='venditori' che non hanno ancora un record associato

INSERT INTO `sellers` (`user_id`, `commission_rate`, `is_active`, `created_at`, `updated_at`)
SELECT 
    u.id AS user_id,
    10.00 AS commission_rate,
    1 AS is_active,
    NOW() AS created_at,
    NOW() AS updated_at
FROM `users` u
WHERE (u.role = 'venditori' OR u.role = 'seller')
  AND u.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM `sellers` s WHERE s.user_id = u.id
  );

-- Verifica risultati
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    u.role,
    s.id AS seller_id,
    s.is_active AS seller_active
FROM `users` u
LEFT JOIN `sellers` s ON s.user_id = u.id
WHERE (u.role = 'venditori' OR u.role = 'seller')
ORDER BY u.id;

