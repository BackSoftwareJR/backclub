-- Link GitHub e sito web per progetto CRM (passati a N8N nei task agente)
ALTER TABLE crm_projects
    ADD COLUMN github_url VARCHAR(500) NULL AFTER settings,
    ADD COLUMN website_url VARCHAR(500) NULL AFTER github_url;
