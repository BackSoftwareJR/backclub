-- Aggiungi campo template_id alla tabella projects se non esiste

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS template_id BIGINT UNSIGNED NULL AFTER project_type_id,
ADD INDEX idx_template_id (template_id);

-- Aggiungi foreign key se non esiste
ALTER TABLE projects 
ADD CONSTRAINT fk_projects_template 
FOREIGN KEY (template_id) REFERENCES project_templates(id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

