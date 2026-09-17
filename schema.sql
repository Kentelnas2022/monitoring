-- ==============================================================================
-- MULTIFACTORS SALES NETWORK MONITORING SYSTEM
-- DICT REGION 10 NOC - RUIJIE CLOUD TELEMETRY & TRIAGE PLATFORM
-- PRODUCTION MYSQL DATABASE SCHEMA & SEED DATA
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `monitoring_system` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `monitoring_system`;

-- Drop existing tables in reverse dependency order if recreating
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `telegram_dispatches`;
DROP TABLE IF EXISTS `downtime_events`;
DROP TABLE IF EXISTS `devices`;
DROP TABLE IF EXISTS `sites`;
DROP TABLE IF EXISTS `area_assignments`;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE (Console Operators & Administrators)
-- ------------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `username` VARCHAR(64) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('SuperAdmin', 'NetworkEngineer', 'Dispatcher', 'Viewer') NOT NULL DEFAULT 'NetworkEngineer',
  `status` ENUM('Active', 'Suspended', 'Deactivated') NOT NULL DEFAULT 'Active',
  `two_factor_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `two_factor_secret` VARCHAR(128) NULL,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. DESIGNATED AREA ASSIGNMENTS TABLE (Field Engineers & Telegram Handles)
-- ------------------------------------------------------------------------------
CREATE TABLE `area_assignments` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `area_name` VARCHAR(120) NOT NULL,
  `person_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(32) NOT NULL DEFAULT '+63 900 000 0000',
  `telegram_username` VARCHAR(64) NOT NULL,
  `telegram_chat_id` VARCHAR(64) NULL,
  `role` VARCHAR(80) NOT NULL DEFAULT 'Designated Area Responder',
  `status` ENUM('Connected', 'Pending', 'Offline') NOT NULL DEFAULT 'Connected',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_area_name` (`area_name`),
  INDEX `idx_telegram_username` (`telegram_username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. NETWORK SITES TABLE (Monitored Regional Facilities)
-- ------------------------------------------------------------------------------
CREATE TABLE `sites` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(160) NOT NULL,
  `code` VARCHAR(32) NOT NULL UNIQUE,
  `region` VARCHAR(80) NOT NULL DEFAULT 'Region X (Northern Mindanao)',
  `province` VARCHAR(80) NOT NULL,
  `status` ENUM('Operational', 'Downtime', 'Maintenance') NOT NULL DEFAULT 'Operational',
  `device_count` INT NOT NULL DEFAULT 0,
  `offline_count` INT NOT NULL DEFAULT 0,
  `online_count` INT NOT NULL DEFAULT 0,
  `active_alarm_count` INT NOT NULL DEFAULT 0,
  `alarm_type` VARCHAR(120) NULL,
  `severity` ENUM('Critical', 'Moderate', 'Info') NULL,
  `downtime_started_at` DATETIME NULL,
  `last_known_ip` VARCHAR(45) NOT NULL DEFAULT '10.0.0.1',
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `assigned_handler_id` VARCHAR(36) NULL,
  `contact_person_name` VARCHAR(120) NULL,
  `contact_person_phone` VARCHAR(32) NULL,
  `contact_person_social` VARCHAR(64) NULL,
  `contact_person_role` VARCHAR(80) NULL DEFAULT 'Designated Responder',
  `ruijie_group_id` VARCHAR(64) NULL,
  `ap_count` INT NOT NULL DEFAULT 0,
  `ap_offline` INT NOT NULL DEFAULT 0,
  `gateway_count` INT NOT NULL DEFAULT 0,
  `gateway_offline` INT NOT NULL DEFAULT 0,
  `switch_count` INT NOT NULL DEFAULT 0,
  `switch_offline` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`assigned_handler_id`) REFERENCES `area_assignments`(`id`) ON DELETE SET NULL,
  INDEX `idx_sites_status` (`status`),
  INDEX `idx_sites_province` (`province`),
  INDEX `idx_sites_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. HARDWARE EQUIPMENT & ACCESS POINTS (Ruijie Cloud Hardware Telemetry)
-- ------------------------------------------------------------------------------
CREATE TABLE `devices` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `site_id` VARCHAR(36) NOT NULL,
  `device_name` VARCHAR(120) NOT NULL,
  `serial_number` VARCHAR(64) NOT NULL UNIQUE,
  `mac_address` VARCHAR(32) NOT NULL UNIQUE,
  `model` VARCHAR(64) NOT NULL,
  `device_type` ENUM('Gateway', 'Switch', 'AccessPoint', 'Router') NOT NULL DEFAULT 'AccessPoint',
  `ip_address` VARCHAR(45) NOT NULL,
  `status` ENUM('Online', 'Offline', 'Rebooting', 'Unmanaged') NOT NULL DEFAULT 'Online',
  `ruijie_device_id` VARCHAR(64) NULL,
  `last_heartbeat_at` DATETIME NULL,
  `firmware_version` VARCHAR(32) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE CASCADE,
  INDEX `idx_device_site` (`site_id`),
  INDEX `idx_device_status` (`status`),
  INDEX `idx_serial_number` (`serial_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. DOWNTIME INCIDENTS & ALARMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE `downtime_events` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `site_id` VARCHAR(36) NOT NULL,
  `alarm_type` VARCHAR(120) NOT NULL,
  `severity` ENUM('Critical', 'Moderate') NOT NULL DEFAULT 'Moderate',
  `status` ENUM('Active', 'Investigating', 'Resolved') NOT NULL DEFAULT 'Active',
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` DATETIME NULL,
  `duration_seconds` INT NOT NULL DEFAULT 0,
  `affected_device_count` INT NOT NULL DEFAULT 1,
  `offline_device_count` INT NOT NULL DEFAULT 1,
  `last_known_ip` VARCHAR(45) NOT NULL,
  `assigned_handler_id` VARCHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_handler_id`) REFERENCES `area_assignments`(`id`) ON DELETE SET NULL,
  INDEX `idx_events_status` (`status`),
  INDEX `idx_events_generated` (`generated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TELEGRAM BOT OUTAGE DISPATCH LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE `telegram_dispatches` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `event_id` VARCHAR(36) NULL,
  `site_id` VARCHAR(36) NOT NULL,
  `recipient_name` VARCHAR(120) NOT NULL,
  `telegram_username` VARCHAR(64) NOT NULL,
  `telegram_chat_id` VARCHAR(64) NULL,
  `message_body` TEXT NOT NULL,
  `status` ENUM('Sent', 'Delivered', 'Failed', 'Pending') NOT NULL DEFAULT 'Sent',
  `error_message` VARCHAR(255) NULL,
  `notes` VARCHAR(255) NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `downtime_events`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE CASCADE,
  INDEX `idx_dispatch_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. AUDIT TRAIL & SYSTEM ACTIVITY LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE `activity_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `type` ENUM('outage', 'assignment', 'telegram', 'recovery', 'system') NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NOT NULL,
  `site_id` VARCHAR(36) NULL,
  `site_name` VARCHAR(160) NULL,
  `site_code` VARCHAR(32) NULL,
  `person_name` VARCHAR(120) NULL,
  `telegram_username` VARCHAR(64) NULL,
  `severity` ENUM('critical', 'warning', 'info', 'success') NOT NULL DEFAULT 'info',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_activity_type` (`type`),
  INDEX `idx_activity_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. SYSTEM CONFIGURATION & INTEGRATION SECRETS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE `system_settings` (
  `config_key` VARCHAR(64) NOT NULL PRIMARY KEY,
  `config_value` TEXT NOT NULL,
  `category` ENUM('general', 'account', 'monitoring', 'telegram', 'ruijie') NOT NULL DEFAULT 'general',
  `is_encrypted` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- INITIAL SEED DATA (DICT REGION 10 & MULTIFACTORS INTEGRATION)
-- ==============================================================================

-- 1. Initial Users
INSERT INTO `users` (`id`, `full_name`, `email`, `username`, `password_hash`, `role`, `status`, `two_factor_enabled`) VALUES
('usr-01', 'Engr. Engel Montero', 'emontero@dict.gov.ph', 'emontero', '$2b$10$NUF3bygVoz/6pGXEMJxOTeINtvwyQjIjciBp7PKMc6CqNEugxZjqO', 'SuperAdmin', 'Active', 0),
('usr-02', 'DICT Region 10 NOC Operator', 'noc@dict.gov.ph', 'dict_noc', '$2b$10$N8vibVvWVy23Q9pJdTPEIeLGs2zu1iFSzc4JT9ldLC0ksIHzVlRxa', 'NetworkEngineer', 'Active', 0)
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

-- 2. Initial Area Assignments
INSERT INTO `area_assignments` (`id`, `area_name`, `person_name`, `phone`, `telegram_username`, `role`, `status`) VALUES
('area-1789001235582', 'Cagayan de Oro City', 'Kenn', '+63 900 000 0000', '7227734738', 'Designated Area Responder', 'Connected'),
('area-1789001255690', 'Camiguin', 'Nathan Salvedia', '+63 900 000 0000', '8406521445', 'Designated Area Responder', 'Connected'),
('area-1789019955333', 'Misamis Occidental', 'Kenn', '+63 900 000 0000', '7227734738', 'Designated Area Responder', 'Connected'),
('area-1789029669650', 'Misamis Occidental', 'Aidrieeel', '+63 900 000 0000', '6032226412', 'Designated Area Responder', 'Connected')
ON DUPLICATE KEY UPDATE `area_name`=VALUES(`area_name`);

-- 6. System Settings
INSERT INTO `system_settings` (`config_key`, `config_value`, `category`) VALUES
('account.email', 'emontero@dict.gov.ph', 'general'),
('account.fullName', 'Engr. Engel Montero', 'general'),
('general.language', 'English', 'general'),
('general.timezone', 'Asia/Manila', 'general'),
('monitoring.syncIntervalSeconds', '30', 'general'),
('ruijie.appId', 'open1d9ecf635290', 'general'),
('ruijie.appSecret', 'a5dfb884bd7847cf8f21d28088f48a7e', 'general'),
('ruijie.baseUrl', 'https://cloud-as.ruijienetworks.com', 'general'),
('telegram.autoDispatchOnDowntime', 'true', 'general'),
('telegram.botToken', '8738860219:AAGHT3ZdCFMzakSVSZCsvMN03P1TMpy2_Jg', 'general'),
('telegram.channelId', '7227734738', 'general')
ON DUPLICATE KEY UPDATE `config_value`=VALUES(`config_value`);

-- 7. Activity Logs
INSERT INTO `activity_logs` (`id`, `type`, `title`, `description`, `site_name`, `site_code`, `person_name`, `telegram_username`, `severity`, `created_at`) VALUES
('act-1789028822801-qid1p', 'system', 'Console Operator Login', 'User Engr. Engel Montero (emontero) authenticated to Multifactors Sales Monitoring System.', NULL, NULL, NULL, NULL, 'info', NOW() - INTERVAL 10 MINUTE),
('act-1789029336206-709e6', 'assignment', 'New Area Assignment Added', 'Kenn designated to Misamis Occidental triage roster (Telegram ID: 7227734738).', NULL, NULL, 'Kenn', '7227734738', 'info', NOW() - INTERVAL 10 MINUTE),
('act-1789029669657-pxa8g', 'assignment', 'New Area Assignment Added', 'Aidrieeel designated to Misamis Occidental triage roster (Telegram ID: 6032226412).', NULL, NULL, 'Aidrieeel', '6032226412', 'info', NOW() - INTERVAL 10 MINUTE)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

