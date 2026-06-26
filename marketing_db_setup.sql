-- ============================================================
-- Backclub CRM - Marketing Database Setup
-- Generato automaticamente il: 2026-06-26
-- Progetto: Organic Web Module
-- IMPORTANTE: Eseguire su database separato (mysql_marketing)
-- NESSUN vincolo FK verso il database principale
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- ------------------------------------------------------------
-- Tabella: user_google_integrations
-- Ref cross-DB: user_id → main_db.users (gestita via Eloquent)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_google_integrations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `google_email` VARCHAR(255) NOT NULL,
  `access_token` TEXT NULL,
  `refresh_token` TEXT NULL,
  `token_expires_at` TIMESTAMP NULL,
  `scopes` JSON NULL,
  `calendar_id` VARCHAR(255) NOT NULL DEFAULT 'primary',
  `auto_sync_calls` TINYINT(1) NOT NULL DEFAULT 1,
  `connected_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  UNIQUE KEY `uq_user_google_integrations_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_web_projects
-- Ref cross-DB: crm_project_id → main_db.crm_projects (gestita via Eloquent)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_web_projects` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `crm_project_id` BIGINT UNSIGNED NOT NULL,
  `website_url` VARCHAR(255) NOT NULL,
  `blog_platform` ENUM('wordpress', 'webflow', 'custom', 'other') NOT NULL DEFAULT 'wordpress',
  `blog_api_url` VARCHAR(255) NULL,
  `blog_api_key_encrypted` TEXT NULL,
  `blog_api_token_encrypted` TEXT NULL,
  `gsc_property_id` VARCHAR(255) NULL,
  `target_keywords` JSON NULL,
  `tone_of_voice` TEXT NULL,
  `target_audience` TEXT NULL,
  `posting_frequency` INT NOT NULL DEFAULT 4,
  `active_skills` JSON NULL,
  `language` VARCHAR(10) NOT NULL DEFAULT 'it',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_audit_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  INDEX `idx_organic_web_projects_crm_project_id` (`crm_project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_skill_runs
-- Ref cross-DB: created_by → main_db.users (gestita via Eloquent)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_skill_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `organic_project_id` BIGINT UNSIGNED NOT NULL,
  `skill_id` VARCHAR(255) NOT NULL,
  `status` ENUM('pending', 'running', 'waiting_human', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  `current_step_index` INT NOT NULL DEFAULT 0,
  `trigger_type` ENUM('cron', 'manual', 'event', 'dependent') NOT NULL DEFAULT 'manual',
  `trigger_data` JSON NULL,
  `context` JSON NULL,
  `started_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `failed_at` TIMESTAMP NULL,
  `error_message` TEXT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_organic_skill_runs_organic_project_id` (`organic_project_id`),
  INDEX `idx_organic_skill_runs_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_skill_steps
-- Ref cross-DB: completed_by → main_db.users (gestita via Eloquent)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_skill_steps` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `skill_run_id` BIGINT UNSIGNED NOT NULL,
  `step_index` INT NOT NULL,
  `step_key` VARCHAR(255) NOT NULL,
  `step_type` ENUM('human', 'ai', 'code', 'api') NOT NULL,
  `status` ENUM('pending', 'running', 'waiting', 'completed', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  `input` JSON NULL,
  `output` JSON NULL,
  `metadata` JSON NULL,
  `started_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `completed_by` BIGINT UNSIGNED NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_organic_skill_steps_skill_run_id` (`skill_run_id`),
  INDEX `idx_organic_skill_steps_completed_by` (`completed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_human_tasks
-- Ref cross-DB: assignee_id → main_db.users (gestita via Eloquent)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_human_tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `skill_step_id` BIGINT UNSIGNED NOT NULL,
  `organic_project_id` BIGINT UNSIGNED NOT NULL,
  `assignee_id` BIGINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `instructions` TEXT NULL,
  `upload_instructions` TEXT NULL,
  `upload_data` JSON NULL,
  `upload_filename` VARCHAR(255) NULL,
  `status` ENUM('pending', 'in_progress', 'completed', 'skipped') NOT NULL DEFAULT 'pending',
  `priority` ENUM('normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  `due_at` TIMESTAMP NULL,
  `reminded_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_organic_human_tasks_skill_step_id` (`skill_step_id`),
  INDEX `idx_organic_human_tasks_organic_project_id` (`organic_project_id`),
  INDEX `idx_organic_human_tasks_assignee_id` (`assignee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_blog_posts
-- Ref cross-DB: approved_by → main_db.users (gestita via Eloquent)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_blog_posts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `organic_project_id` BIGINT UNSIGNED NOT NULL,
  `skill_run_id` BIGINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `target_keyword` VARCHAR(255) NULL,
  `secondary_keywords` JSON NULL,
  `status` ENUM('planned', 'writing', 'review', 'approved', 'published', 'rejected') NOT NULL DEFAULT 'planned',
  `scheduled_date` DATE NULL,
  `published_date` TIMESTAMP NULL,
  `published_url` VARCHAR(255) NULL,
  `content` LONGTEXT NULL,
  `meta_title` VARCHAR(255) NULL,
  `meta_description` TEXT NULL,
  `word_count` INT NULL,
  `seo_score` INT NULL,
  `human_approved` TINYINT(1) NOT NULL DEFAULT 0,
  `approved_by` BIGINT UNSIGNED NULL,
  `approved_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  INDEX `idx_organic_blog_posts_organic_project_id` (`organic_project_id`),
  INDEX `idx_organic_blog_posts_skill_run_id` (`skill_run_id`),
  INDEX `idx_organic_blog_posts_approved_by` (`approved_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_seo_audits
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_seo_audits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `organic_project_id` BIGINT UNSIGNED NOT NULL,
  `skill_run_id` BIGINT UNSIGNED NULL,
  `audit_date` DATE NOT NULL,
  `overall_score` INT NULL,
  `pages_crawled` INT NOT NULL DEFAULT 0,
  `issues` JSON NULL,
  `recommendations` JSON NULL,
  `critical_count` INT NOT NULL DEFAULT 0,
  `warning_count` INT NOT NULL DEFAULT 0,
  `info_count` INT NOT NULL DEFAULT 0,
  `raw_crawl_data` JSON NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_organic_seo_audits_organic_project_id` (`organic_project_id`),
  INDEX `idx_organic_seo_audits_skill_run_id` (`skill_run_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_keyword_snapshots
-- Ref cross-DB: approved_by → main_db.users (gestita via Eloquent)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_keyword_snapshots` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `organic_project_id` BIGINT UNSIGNED NOT NULL,
  `snapshot_date` DATE NOT NULL,
  `month` INT NOT NULL,
  `year` INT NOT NULL,
  `raw_keywords` JSON NULL,
  `clustered_keywords` JSON NULL,
  `primary_cluster` JSON NULL,
  `search_intents` JSON NULL,
  `approved_at` TIMESTAMP NULL,
  `approved_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_organic_keyword_snapshots_organic_project_id` (`organic_project_id`),
  INDEX `idx_organic_keyword_snapshots_approved_by` (`approved_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_project_google_integrations
-- Connessione Google Search Console per ogni progetto Organic Web.
-- Ref cross-DB: user_id → main_db.users (gestita via Eloquent)
-- Ref intra-DB: organic_web_project_id → organic_web_projects (FK ok, stesso DB)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_project_google_integrations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `organic_web_project_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `access_token` TEXT NULL,
  `refresh_token` TEXT NULL,
  `token_expires_at` TIMESTAMP NULL,
  `connected_at` TIMESTAMP NULL,
  `gsc_property_url` VARCHAR(512) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  UNIQUE KEY `uq_organic_project_google_integrations_project` (`organic_web_project_id`),
  INDEX `idx_organic_project_google_integrations_user_id` (`user_id`),
  CONSTRAINT `fk_opgi_organic_web_project_id`
    FOREIGN KEY (`organic_web_project_id`)
    REFERENCES `organic_web_projects` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;

-- ------------------------------------------------------------
-- Tabella: organic_gsc_url_details
-- Cache dettagli per singolo URL da GSC URL Inspection API
-- Ref cross-DB: organic_web_project_id → mysql_marketing.organic_web_projects (FK ok)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_gsc_url_details` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `organic_web_project_id` BIGINT UNSIGNED NOT NULL,
  `url` VARCHAR(2048) NOT NULL,
  `indexing_status` VARCHAR(64) NULL,
  `last_crawled` TIMESTAMP NULL,
  `canonical_url` VARCHAR(2048) NULL,
  `mobile_usability` VARCHAR(64) NULL,
  `coverage_state` VARCHAR(128) NULL,
  `blocked_by_robots` TINYINT(1) NOT NULL DEFAULT 0,
  `errors_json` JSON NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_ogud_project_id` (`organic_web_project_id`),
  INDEX `idx_ogud_project_status` (`organic_web_project_id`, `indexing_status`),
  CONSTRAINT `fk_ogud_organic_web_project_id`
    FOREIGN KEY (`organic_web_project_id`)
    REFERENCES `organic_web_projects` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_sitemap_alerts
-- Storico alert automatici per il modulo Sitemap
-- Ref intra-DB: organic_web_project_id → organic_web_projects (FK ok)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_sitemap_alerts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `organic_web_project_id` BIGINT UNSIGNED NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `severity` ENUM('critical','warning','info') NOT NULL DEFAULT 'info',
  `message` TEXT NOT NULL,
  `resolved_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_osa_project_id` (`organic_web_project_id`),
  INDEX `idx_osa_project_resolved` (`organic_web_project_id`, `resolved_at`),
  CONSTRAINT `fk_osa_organic_web_project_id`
    FOREIGN KEY (`organic_web_project_id`)
    REFERENCES `organic_web_projects` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabella: organic_sitemap_health_history
-- Trend dello health score nel tempo
-- Ref intra-DB: organic_web_project_id → organic_web_projects (FK ok)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organic_sitemap_health_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `organic_web_project_id` BIGINT UNSIGNED NOT NULL,
  `score` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `breakdown_json` JSON NULL,
  `recorded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_oshh_project_id` (`organic_web_project_id`),
  INDEX `idx_oshh_project_recorded` (`organic_web_project_id`, `recorded_at`),
  CONSTRAINT `fk_oshh_organic_web_project_id`
    FOREIGN KEY (`organic_web_project_id`)
    REFERENCES `organic_web_projects` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
-- Fine script marketing_db_setup.sql
