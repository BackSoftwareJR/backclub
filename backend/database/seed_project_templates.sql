-- Seed Project Templates
-- Inserisce i template di progetto base nel sistema

-- Template Casa Famiglia
INSERT INTO project_templates (code, name, description, icon, color, default_duration_days, has_tasks, is_active, created_at, updated_at) VALUES
('CF_CONTRATTO_COMPLETO', 'Casa Famiglia - Contratto Completo', 'Gestione completa casa famiglia con tutti i servizi', 'Home', '#34C759', 180, TRUE, TRUE, NOW(), NOW()),
('CF_CONTRATTO_SPOT', 'Casa Famiglia - Contratto Spot', 'Campagna spot e landing page per casa famiglia', 'Home', '#FF9F0A', 90, TRUE, TRUE, NOW(), NOW()),
('CUSTOM', 'Progetto Custom', 'Progetto personalizzato senza template predefinito', 'FileText', '#8E8E93', 60, FALSE, TRUE, NOW(), NOW());

-- Template ADS Center
INSERT INTO project_templates (code, name, description, icon, color, default_duration_days, has_tasks, is_active, created_at, updated_at) VALUES
('ADS_CENTER_GOOGLE', 'Ads Center - Google', 'Gestione campagne Google Ads', 'BarChart3', '#4285F4', 30, TRUE, TRUE, NOW(), NOW()),
('ADS_CENTER_META', 'Ads Center - Meta', 'Gestione campagne Meta (Facebook/Instagram)', 'BarChart3', '#0084FF', 30, TRUE, TRUE, NOW(), NOW()),
('ADS_FORMAZIONE', 'Ads - Formazione', 'Campagne pubblicitarie per corsi di formazione', 'BookOpen', '#FF6482', 45, TRUE, TRUE, NOW(), NOW());

-- Template CRM
INSERT INTO project_templates (code, name, description, icon, color, default_duration_days, has_tasks, is_active, created_at, updated_at) VALUES
('CRM_VITIVINICOLO', 'CRM Vitivinicolo', 'Sistema gestionale per aziende vinicole', 'Database', '#AF52DE', 180, TRUE, TRUE, NOW(), NOW()),
('CRM_BPRES', 'CRM Bpres', 'CRM personalizzato Bpres', 'Database', '#5856D6', 120, TRUE, TRUE, NOW(), NOW()),
('CRM_AUTODEMOLIZIONI', 'CRM Autodemolizioni', 'Gestionale autodemolizioni completo', 'Database', '#FF2D55', 150, TRUE, TRUE, NOW(), NOW()),
('CRM_CUSTOM', 'CRM Custom', 'CRM personalizzato su misura', 'Database', '#00C7BE', 120, FALSE, TRUE, NOW(), NOW());

-- Template Web/Formazione
INSERT INTO project_templates (code, name, description, icon, color, default_duration_days, has_tasks, is_active, created_at, updated_at) VALUES
('WEB_FORMAZIONE', 'Web - Formazione', 'Piattaforma web per corsi di formazione', 'BookOpen', '#30D158', 90, TRUE, TRUE, NOW(), NOW()),
('SITO_WEB_MULTIPAGINA', 'Sito Web Multipagina', 'Sviluppo sito web aziendale multipagina', 'Globe', '#0A84FF', 60, TRUE, TRUE, NOW(), NOW()),
('LANDING_PAGE', 'Landing Page', 'Creazione landing page marketing', 'FileText', '#FF9500', 30, TRUE, TRUE, NOW(), NOW()),
('WEB_RESTYLING', 'Web - Restyling', 'Restyling sito web esistente', 'Globe', '#5E5CE6', 45, TRUE, TRUE, NOW(), NOW());

-- Template Video
INSERT INTO project_templates (code, name, description, icon, color, default_duration_days, has_tasks, is_active, created_at, updated_at) VALUES
('VIDEO_PUBBLICITARIO_COMPLETO', 'Video Pubblicitario Completo', 'Produzione video pubblicitario completo (shooting + montaggio)', 'Video', '#FF3B30', 45, TRUE, TRUE, NOW(), NOW()),
('MONTAGGIO_VIDEO', 'Montaggio Video', 'Solo montaggio video da materiale esistente', 'Video', '#FF6482', 15, TRUE, TRUE, NOW(), NOW()),
('SHOOTING_FOTOGRAFICO', 'Shooting Fotografico', 'Servizio fotografico professionale', 'Camera', '#FF2D55', 7, TRUE, TRUE, NOW(), NOW());

-- ========================================
-- RUOLI STANDARD PER TEMPLATE CON TASK
-- ========================================

-- Ruoli per Casa Famiglia Spot (CF_CONTRATTO_SPOT)
INSERT INTO project_template_roles (template_id, role_code, role_name, is_required, created_at, updated_at)
SELECT id, 'project_manager', 'Project Manager', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'CF_CONTRATTO_SPOT'
UNION ALL
SELECT id, 'web_developer', 'Web Developer', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'CF_CONTRATTO_SPOT'
UNION ALL
SELECT id, 'social_media_manager', 'Social Media Manager', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'CF_CONTRATTO_SPOT'
UNION ALL
SELECT id, 'videomaker', 'Videomaker', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'CF_CONTRATTO_SPOT'
UNION ALL
SELECT id, 'segreteria', 'Segreteria', FALSE, NOW(), NOW() FROM project_templates WHERE code = 'CF_CONTRATTO_SPOT';

-- Ruoli per Ads Center Google
INSERT INTO project_template_roles (template_id, role_code, role_name, is_required, created_at, updated_at)
SELECT id, 'ads_manager', 'Ads Manager Google', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE'
UNION ALL
SELECT id, 'copywriter', 'Copywriter', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE'
UNION ALL
SELECT id, 'graphic_designer', 'Graphic Designer', FALSE, NOW(), NOW() FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE';

-- Ruoli per Ads Center Meta
INSERT INTO project_template_roles (template_id, role_code, role_name, is_required, created_at, updated_at)
SELECT id, 'ads_manager', 'Ads Manager Meta', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'ADS_CENTER_META'
UNION ALL
SELECT id, 'copywriter', 'Copywriter', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'ADS_CENTER_META'
UNION ALL
SELECT id, 'graphic_designer', 'Graphic Designer', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'ADS_CENTER_META';

-- Ruoli per Sito Web Multipagina
INSERT INTO project_template_roles (template_id, role_code, role_name, is_required, created_at, updated_at)
SELECT id, 'web_developer', 'Web Developer', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT id, 'ui_ux_designer', 'UI/UX Designer', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT id, 'copywriter', 'Copywriter', FALSE, NOW(), NOW() FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT id, 'seo_specialist', 'SEO Specialist', FALSE, NOW(), NOW() FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA';

-- Ruoli per Landing Page
INSERT INTO project_template_roles (template_id, role_code, role_name, is_required, created_at, updated_at)
SELECT id, 'web_developer', 'Web Developer', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'LANDING_PAGE'
UNION ALL
SELECT id, 'copywriter', 'Copywriter', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'LANDING_PAGE'
UNION ALL
SELECT id, 'graphic_designer', 'Graphic Designer', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'LANDING_PAGE';

-- Ruoli per Video Pubblicitario
INSERT INTO project_template_roles (template_id, role_code, role_name, is_required, created_at, updated_at)
SELECT id, 'videomaker', 'Videomaker', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'VIDEO_PUBBLICITARIO_COMPLETO'
UNION ALL
SELECT id, 'video_editor', 'Video Editor', TRUE, NOW(), NOW() FROM project_templates WHERE code = 'VIDEO_PUBBLICITARIO_COMPLETO'
UNION ALL
SELECT id, 'creative_director', 'Creative Director', FALSE, NOW(), NOW() FROM project_templates WHERE code = 'VIDEO_PUBBLICITARIO_COMPLETO';

-- ========================================
-- TASK ESEMPIO PER LANDING PAGE
-- ========================================

-- Task per Landing Page (esempio base)
INSERT INTO project_template_tasks (template_id, role_code, title, description, priority, start_offset_days, due_offset_days, estimated_hours, order_index, created_at, updated_at)
SELECT 
    id,
    'web_developer',
    'Analisi requisiti e wireframe',
    'Incontro con cliente e definizione struttura landing page',
    'high',
    0,
    3,
    4.0,
    1,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'LANDING_PAGE'
UNION ALL
SELECT 
    id,
    'graphic_designer',
    'Design mockup landing page',
    'Creazione design grafico e UI della landing page',
    'high',
    3,
    7,
    8.0,
    2,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'LANDING_PAGE'
UNION ALL
SELECT 
    id,
    'copywriter',
    'Scrittura testi e copy',
    'Redazione testi persuasivi per la landing page',
    'medium',
    3,
    7,
    6.0,
    3,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'LANDING_PAGE'
UNION ALL
SELECT 
    id,
    'web_developer',
    'Sviluppo landing page',
    'Implementazione codice HTML/CSS/JS della landing',
    'high',
    7,
    14,
    12.0,
    4,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'LANDING_PAGE'
UNION ALL
SELECT 
    id,
    'web_developer',
    'Ottimizzazione SEO e performance',
    'Ottimizzazione caricamento, SEO on-page e test PageSpeed',
    'medium',
    14,
    18,
    4.0,
    5,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'LANDING_PAGE'
UNION ALL
SELECT 
    id,
    'web_developer',
    'Test e deploy finale',
    'Test cross-browser, responsive e pubblicazione online',
    'high',
    18,
    21,
    3.0,
    6,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'LANDING_PAGE';

-- ========================================
-- TASK ESEMPIO PER SITO WEB MULTIPAGINA
-- ========================================

INSERT INTO project_template_tasks (template_id, role_code, title, description, priority, start_offset_days, due_offset_days, estimated_hours, order_index, created_at, updated_at)
SELECT 
    id,
    'web_developer',
    'Kickoff meeting e analisi',
    'Riunione iniziale con stakeholder e raccolta requisiti',
    'high',
    0,
    2,
    4.0,
    1,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'ui_ux_designer',
    'Information Architecture e Wireframe',
    'Definizione struttura sito e wireframe pagine principali',
    'high',
    2,
    7,
    12.0,
    2,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'ui_ux_designer',
    'Design UI completo',
    'Creazione mockup grafici di tutte le pagine',
    'high',
    7,
    14,
    20.0,
    3,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'copywriter',
    'Redazione contenuti',
    'Scrittura testi per tutte le sezioni del sito',
    'medium',
    7,
    14,
    16.0,
    4,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'web_developer',
    'Setup ambiente e struttura',
    'Configurazione CMS, hosting e struttura base progetto',
    'high',
    14,
    17,
    8.0,
    5,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'web_developer',
    'Sviluppo frontend',
    'Implementazione HTML/CSS/JS responsive',
    'high',
    17,
    28,
    32.0,
    6,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'web_developer',
    'Integrazione backend e CMS',
    'Collegamento database, form e pannello amministrazione',
    'high',
    28,
    35,
    20.0,
    7,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'seo_specialist',
    'SEO on-page e ottimizzazione',
    'Ottimizzazione SEO, meta tag, sitemap e performance',
    'medium',
    35,
    42,
    12.0,
    8,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'web_developer',
    'Testing completo',
    'Test funzionalità, cross-browser, responsive e security',
    'high',
    42,
    49,
    16.0,
    9,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'web_developer',
    'Deploy e go-live',
    'Pubblicazione finale e configurazione DNS',
    'urgent',
    49,
    52,
    6.0,
    10,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA'
UNION ALL
SELECT 
    id,
    'web_developer',
    'Formazione cliente e documentazione',
    'Training utilizzo CMS e consegna documentazione',
    'medium',
    52,
    56,
    4.0,
    11,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'SITO_WEB_MULTIPAGINA';

-- ========================================
-- TASK ESEMPIO PER CAMPAGNE ADS
-- ========================================

INSERT INTO project_template_tasks (template_id, role_code, title, description, priority, start_offset_days, due_offset_days, estimated_hours, order_index, created_at, updated_at)
SELECT 
    id,
    'ads_manager',
    'Briefing e definizione obiettivi',
    'Incontro con cliente per definire obiettivi campagna, budget e KPI',
    'high',
    0,
    1,
    3.0,
    1,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE'
UNION ALL
SELECT 
    id,
    'ads_manager',
    'Ricerca keyword e competitor analysis',
    'Analisi parole chiave e studio campagne concorrenti',
    'high',
    1,
    3,
    6.0,
    2,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE'
UNION ALL
SELECT 
    id,
    'copywriter',
    'Creazione copy annunci',
    'Scrittura testi pubblicitari per annunci Google Ads',
    'high',
    3,
    5,
    4.0,
    3,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE'
UNION ALL
SELECT 
    id,
    'ads_manager',
    'Setup campagna e configurazione',
    'Creazione campagna, gruppi annunci e impostazioni targeting',
    'high',
    5,
    7,
    5.0,
    4,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE'
UNION ALL
SELECT 
    id,
    'ads_manager',
    'Lancio campagna',
    'Attivazione campagna e monitoraggio iniziale',
    'urgent',
    7,
    8,
    2.0,
    5,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE'
UNION ALL
SELECT 
    id,
    'ads_manager',
    'Monitoraggio e ottimizzazione settimanale',
    'Analisi performance, A/B test e ottimizzazione bid',
    'high',
    8,
    30,
    12.0,
    6,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE'
UNION ALL
SELECT 
    id,
    'ads_manager',
    'Report finale e presentazione risultati',
    'Creazione report completo e presentazione al cliente',
    'medium',
    28,
    30,
    4.0,
    7,
    NOW(),
    NOW()
FROM project_templates WHERE code = 'ADS_CENTER_GOOGLE';

-- Conferma inserimento
SELECT 
    pt.name AS template_name,
    COUNT(DISTINCT ptr.id) AS num_roles,
    COUNT(DISTINCT ptt.id) AS num_tasks
FROM project_templates pt
LEFT JOIN project_template_roles ptr ON pt.id = ptr.template_id
LEFT JOIN project_template_tasks ptt ON pt.id = ptt.template_id
GROUP BY pt.id, pt.name
ORDER BY pt.name;

