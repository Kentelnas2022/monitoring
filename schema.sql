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
  `ruijie_group_id` VARCHAR(64) NULL,
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
('usr-01', 'Engr. Engel Montero', 'emontero@dict.gov.ph', 'emontero', '$2a$12$e8Qz9Z8k0Kq9pW5k6Y7JreX3v4b5n6m7o8p9q0r1s2t3u4v5w6x7y', 'SuperAdmin', 'Active', 0),
('usr-02', 'DICT Region 10 NOC Operator', 'noc@dict.gov.ph', 'dict_noc', '$2a$12$e8Qz9Z8k0Kq9pW5k6Y7JreX3v4b5n6m7o8p9q0r1s2t3u4v5w6x7y', 'NetworkEngineer', 'Active', 0)
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

-- 2. Initial Area Assignments
INSERT INTO `area_assignments` (`id`, `area_name`, `person_name`, `phone`, `telegram_username`, `role`, `status`) VALUES
('area-1', 'Bukidnon Area', 'Engr. Juan Dela Cruz', '+63 917 123 4567', 'jdelacruz_dict', 'Lead Network Engineer', 'Connected'),
('area-2', 'Misamis Occidental Area', 'Althea Ramos', '+63 928 765 4321', 'aramos_noc', 'Field Support Specialist', 'Connected'),
('area-3', 'Lanao del Norte Area', 'Patricia Joy Santos', '+63 922 444 9876', 'pjsantos_ldn', 'Provincial NOC Dispatcher', 'Connected'),
('area-4', 'Misamis Oriental Area', 'Catherine Villanueva', '+63 918 555 3344', 'cvillanueva_noc', 'Regional Support Lead', 'Connected'),
('area-5', 'BARMM Region / Cotabato City', 'Abdul Rashid Macapaar', '+63 930 777 6543', 'armacapaar_barmm', 'BARMM Cluster Lead', 'Connected'),
('area-6', 'Camiguin Island Area', 'Roderick Tan', '+63 917 888 1122', 'rtan_camiguin', 'Island Field Responder', 'Connected'),
('area-7', 'Cagayan de Oro City Center', 'Engr. Engel Montero', '+63 920 333 4455', 'emontero_dict', 'Regional NOC Supervisor', 'Connected'),
('area-8', 'Iligan City NOC Station', 'Mark Lester Gomez', '+63 919 666 7788', 'mgomez_iligan', 'Sub-regional NOC Engineer', 'Connected')
ON DUPLICATE KEY UPDATE `area_name`=VALUES(`area_name`);

-- 3. Monitored Sites (All 152 Regional Facilities in Northern Mindanao & BARMM)
INSERT INTO `sites` (`id`, `name`, `code`, `region`, `province`, `status`, `device_count`, `offline_count`, `online_count`, `active_alarm_count`, `alarm_type`, `severity`, `downtime_started_at`, `last_known_ip`, `latitude`, `longitude`, `assigned_handler_id`) VALUES
('site-01', 'DICT MIS OCC OROQUIETA CITY HALL I', 'MO-ORQ-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Downtime', 4, 4, 0, 4, 'All device offline', 'Critical', NOW() - INTERVAL 1 HOUR, '10.144.12.1', 8.48600000, 123.80400000, 'area-1'),
('site-02', 'DICT PICS NUNUNGAN', 'LDN-NUN-01', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Downtime', 4, 1, 3, 1, '1 of 4 AP offline', 'Moderate', NOW() - INTERVAL 1 HOUR, '10.145.88.14', 7.84000000, 123.93500000, 'area-2'),
('site-03', 'DICT MIS OCC ALORAN MUNICIPAL HALL', 'MO-ALR-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Downtime', 4, 2, 2, 2, '2 of 4 AP offline', 'Moderate', NOW() - INTERVAL 1 HOUR, '10.144.19.4', 8.35000000, 123.83000000, 'area-3'),
('site-04', 'DICT LANAO DEL NORTE BALOI POBLACION', 'LDN-BAL-02', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Downtime', 5, 5, 0, 5, 'All device offline', 'Critical', NOW() - INTERVAL 1 HOUR, '10.145.102.1', 8.11300000, 124.22500000, 'area-4'),
('site-05', 'DICT MIS OCC JIMENEZ RHU II', 'MO-JIM-02', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Downtime', 4, 1, 3, 1, '1 of 4 AP offline', 'Moderate', NOW() - INTERVAL 1 HOUR, '10.144.33.1', 8.33000000, 123.85000000, 'area-5'),
('site-06', 'DICT BUKIDNON MALITBOG MUNICIPAL BLDG', 'BUK-MAL-01', 'Region X (Northern Mindanao)', 'Bukidnon', 'Downtime', 6, 6, 0, 6, 'All device offline', 'Critical', NOW() - INTERVAL 1 HOUR, '10.148.05.20', 8.53000000, 124.87000000, 'area-6'),
('site-07', 'DICT MIS OCC TUDELA MUNICIPAL HALL', 'MO-TUD-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Downtime', 4, 2, 2, 2, '2 of 4 AP offline', 'Moderate', NOW() - INTERVAL 1 HOUR, '10.144.52.1', 8.28000000, 123.84000000, 'area-1'),
('site-08', 'DICT LANAO DEL SUR MARAWI CITY CAPITOL', 'BARMM-MAR-01', 'BARMM', 'Lanao del Sur', 'Downtime', 8, 8, 0, 8, 'All device offline', 'Critical', NOW() - INTERVAL 1 HOUR, '10.150.12.8', 8.00000000, 124.28500000, 'area-5'),
('site-op-001', 'DICT MISAMIS OCCIDENTAL OZAMIZ CITY PORT FACILITY', 'MO-OZA-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.10.1', 8.14000000, 123.84000000, 'area-1'),
('site-op-002', 'DICT MISAMIS OCCIDENTAL TANGUB CITY GOV CENTER', 'MO-TNG-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.11.2', 8.06000000, 123.75000000, 'area-2'),
('site-op-003', 'DICT MISAMIS OCCIDENTAL CLARIN MUNICIPAL LIBRARY', 'MO-CLR-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.12.3', 8.20000000, 123.85000000, 'area-3'),
('site-op-004', 'DICT MISAMIS OCCIDENTAL BONIFACIO COMM CENTER', 'MO-BON-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.13.4', 8.10000000, 123.60000000, 'area-4'),
('site-op-005', 'DICT MISAMIS OCCIDENTAL SINACABAN RHU FACILITY', 'MO-SNC-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.14.5', 8.28000000, 123.84000000, 'area-5'),
('site-op-006', 'DICT MISAMIS OCCIDENTAL LOPEZ JAENA DISPATCH', 'MO-LPJ-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.15.6', 8.53000000, 123.76000000, 'area-6'),
('site-op-007', 'DICT MISAMIS OCCIDENTAL BALIANGAO TECH HUB', 'MO-BLG-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.16.7', 8.66000000, 123.60000000, 'area-7'),
('site-op-008', 'DICT MISAMIS OCCIDENTAL SAPANG DALAGA HEALTH POST', 'MO-SPD-01', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.17.8', 8.55000000, 123.55000000, 'area-8'),
('site-op-009', 'DICT LANAO DEL NORTE ILIGAN CITY DISASTER OFFICE', 'LDN-ILG-01', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.18.9', 8.23000000, 124.25000000, 'area-1'),
('site-op-010', 'DICT LANAO DEL NORTE KAUSWAGAN PEACE COMPLEX', 'LDN-KSW-01', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.19.10', 8.16000000, 124.10000000, 'area-2'),
('site-op-011', 'DICT LANAO DEL NORTE BACOLOD MUNICIPAL HALL', 'LDN-BCD-01', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.20.11', 8.18000000, 124.01000000, 'area-3'),
('site-op-012', 'DICT LANAO DEL NORTE MAIGO CIVIC CENTER', 'LDN-MGO-01', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.21.12', 8.15000000, 123.95000000, 'area-4'),
('site-op-013', 'DICT LANAO DEL NORTE KOLAMBUGAN HARBOR GATE', 'LDN-KLM-01', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.22.13', 8.11000000, 123.90000000, 'area-5'),
('site-op-014', 'DICT LANAO DEL NORTE LALA RURAL HEALTH UNIT', 'LDN-LLA-01', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.23.14', 7.97000000, 123.75000000, 'area-6'),
('site-op-015', 'DICT LANAO DEL NORTE SALVADOR TRAINING CENTER', 'LDN-SLV-01', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.24.15', 7.89000000, 123.84000000, 'area-7'),
('site-op-016', 'DICT LANAO DEL NORTE SULTAN NAGA DIMAPORO TERMINAL', 'LDN-SND-01', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.25.16', 7.78000000, 123.75000000, 'area-8'),
('site-op-017', 'DICT BUKIDNON MALAYBALAY CITY TECH WING', 'BUK-MLB-01', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.26.17', 8.15000000, 125.13000000, 'area-1'),
('site-op-018', 'DICT BUKIDNON VALENCIA CITY PUBLIC MARKET', 'BUK-VAL-01', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.27.18', 7.90000000, 125.09000000, 'area-2'),
('site-op-019', 'DICT BUKIDNON MARAMAG AGRI EXCHANGE', 'BUK-MRM-01', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.28.19', 7.75000000, 125.00000000, 'area-3'),
('site-op-020', 'DICT BUKIDNON QUEZON MUNICIPAL HALL', 'BUK-QZN-01', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.29.20', 7.73000000, 125.10000000, 'area-4'),
('site-op-021', 'DICT BUKIDNON DON CARLOS EMERGENCY CLINIC', 'BUK-DCL-01', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.30.21', 7.68000000, 125.00000000, 'area-5'),
('site-op-022', 'DICT BUKIDNON PANGANTUCAN SEED FACILITY', 'BUK-PNG-01', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.31.22', 7.82000000, 124.82000000, 'area-6'),
('site-op-023', 'DICT BUKIDNON TALAKAG MOUNTAIN RELAY', 'BUK-TLK-01', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.32.23', 8.23000000, 124.60000000, 'area-7'),
('site-op-024', 'DICT BUKIDNON BAUNGON WATERSHED POST', 'BUK-BNG-01', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.33.24', 8.35000000, 124.68000000, 'area-8'),
('site-op-025', 'DICT MISAMIS ORIENTAL CAGAYAN DE ORO CITY HALL', 'MOR-CDO-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.34.25', 8.48000000, 124.65000000, 'area-1'),
('site-op-026', 'DICT MISAMIS ORIENTAL GINGOOG CITY SEAPORT WARD', 'MOR-GNG-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.35.26', 8.82000000, 125.10000000, 'area-2'),
('site-op-027', 'DICT MISAMIS ORIENTAL EL SALVADOR INNOVATION PARK', 'MOR-ELS-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.36.27', 8.56000000, 124.52000000, 'area-3'),
('site-op-028', 'DICT MISAMIS ORIENTAL OPOL EVACUATION COMPLEX', 'MOR-OPL-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.37.28', 8.52000000, 124.57000000, 'area-4'),
('site-op-029', 'DICT MISAMIS ORIENTAL TAGOLOAN INDUSTRIAL TERMINAL', 'MOR-TGL-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.38.29', 8.54000000, 124.75000000, 'area-5'),
('site-op-030', 'DICT MISAMIS ORIENTAL VILLANUEVA POWER RELAY', 'MOR-VLN-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.39.30', 8.58000000, 124.77000000, 'area-6'),
('site-op-031', 'DICT MISAMIS ORIENTAL JASAAN SKILLS INSTITUTE', 'MOR-JSN-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.40.31', 8.65000000, 124.75000000, 'area-7'),
('site-op-032', 'DICT MISAMIS ORIENTAL BALINGASAG FISH PORT', 'MOR-BLS-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.41.32', 8.74000000, 124.77000000, 'area-8'),
('site-op-033', 'DICT MISAMIS ORIENTAL INITAO MUNICIPAL HALL', 'MOR-INT-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.42.33', 8.50000000, 124.30000000, 'area-1'),
('site-op-034', 'DICT MISAMIS ORIENTAL LUGAIT REVENUE TERMINAL', 'MOR-LGT-01', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.43.34', 8.34000000, 124.26000000, 'area-2'),
('site-op-035', 'DICT BARMM COTABATO CITY REGIONAL HQ', 'BARMM-COT-01', 'BARMM', 'BARMM', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.44.35', 7.22000000, 124.25000000, 'area-3'),
('site-op-036', 'DICT BARMM PARANG HARBOR DEPOT', 'BARMM-PRG-01', 'BARMM', 'BARMM', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.45.36', 7.37000000, 124.27000000, 'area-4'),
('site-op-037', 'DICT BARMM UPI COMMUNITY RADIO POST', 'BARMM-UPI-01', 'BARMM', 'BARMM', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.46.37', 7.03000000, 124.17000000, 'area-5'),
('site-op-038', 'DICT BARMM SULTAN KUDARAT ADMIN WING', 'BARMM-SKD-01', 'BARMM', 'BARMM', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.47.38', 7.24000000, 124.30000000, 'area-6'),
('site-op-039', 'DICT BARMM DATU ODIN SINSUAT HALL', 'BARMM-DOS-01', 'BARMM', 'BARMM', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.48.39', 7.17000000, 124.21000000, 'area-7'),
('site-op-040', 'DICT BARMM BULUAN PROVINCIAL CAPITOL', 'BARMM-BLN-01', 'BARMM', 'BARMM', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.49.40', 6.72000000, 124.80000000, 'area-8'),
('site-op-041', 'DICT BARMM PAGALUNGAN RIVERINE POST', 'BARMM-PGL-01', 'BARMM', 'BARMM', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.50.41', 7.05000000, 124.70000000, 'area-1'),
('site-op-042', 'DICT BARMM SHARIFF AGUAK EMERGENCY CENTER', 'BARMM-SHA-01', 'BARMM', 'BARMM', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.51.42', 6.86000000, 124.44000000, 'area-2'),
('site-op-043', 'DICT BARMM JOLO ISLAND CIVIC TERMINAL', 'BARMM-JLO-01', 'BARMM', 'BARMM', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.52.43', 6.05000000, 121.00000000, 'area-3'),
('site-op-044', 'DICT BARMM BONGAO SEAFRONT WARD', 'BARMM-BGO-01', 'BARMM', 'BARMM', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.53.44', 5.03000000, 119.77000000, 'area-4'),
('site-op-045', 'DICT BASILAN ISABELA CITY TECH DESK', 'BAS-ISA-01', 'BARMM', 'Basilan', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.54.45', 6.70000000, 121.97000000, 'area-5'),
('site-op-046', 'DICT BASILAN LAMITAN CITY CIVIC HALL', 'BAS-LAM-01', 'BARMM', 'Basilan', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.55.46', 6.65000000, 122.13000000, 'area-6'),
('site-op-047', 'DICT MISAMIS OCCIDENTAL OZAMIZ CITY PORT FACILITY 2', 'MO-OZA-02', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.56.47', 8.15500000, 123.82500000, 'area-7'),
('site-op-048', 'DICT MISAMIS OCCIDENTAL TANGUB CITY GOV CENTER 2', 'MO-TNG-02', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.57.48', 8.04500000, 123.73500000, 'area-8'),
('site-op-049', 'DICT MISAMIS OCCIDENTAL CLARIN MUNICIPAL LIBRARY 2', 'MO-CLR-02', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.58.49', 8.21500000, 123.86500000, 'area-1'),
('site-op-050', 'DICT MISAMIS OCCIDENTAL BONIFACIO COMM CENTER 2', 'MO-BON-02', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.59.50', 8.08500000, 123.58500000, 'area-2'),
('site-op-051', 'DICT MISAMIS OCCIDENTAL SINACABAN RHU FACILITY 2', 'MO-SNC-02', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.60.51', 8.29500000, 123.82500000, 'area-3'),
('site-op-052', 'DICT MISAMIS OCCIDENTAL LOPEZ JAENA DISPATCH 2', 'MO-LPJ-02', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.61.52', 8.51500000, 123.77500000, 'area-4'),
('site-op-053', 'DICT MISAMIS OCCIDENTAL BALIANGAO TECH HUB 2', 'MO-BLG-02', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.62.53', 8.67500000, 123.58500000, 'area-5'),
('site-op-054', 'DICT MISAMIS OCCIDENTAL SAPANG DALAGA HEALTH POST 2', 'MO-SPD-02', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.63.54', 8.53500000, 123.53500000, 'area-6'),
('site-op-055', 'DICT LANAO DEL NORTE ILIGAN CITY DISASTER OFFICE 2', 'LDN-ILG-02', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.64.55', 8.24500000, 124.26500000, 'area-7'),
('site-op-056', 'DICT LANAO DEL NORTE KAUSWAGAN PEACE COMPLEX 2', 'LDN-KSW-02', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.65.56', 8.14500000, 124.08500000, 'area-8'),
('site-op-057', 'DICT LANAO DEL NORTE BACOLOD MUNICIPAL HALL 2', 'LDN-BCD-02', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.66.57', 8.19500000, 123.99500000, 'area-1'),
('site-op-058', 'DICT LANAO DEL NORTE MAIGO CIVIC CENTER 2', 'LDN-MGO-02', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.67.58', 8.13500000, 123.96500000, 'area-2'),
('site-op-059', 'DICT LANAO DEL NORTE KOLAMBUGAN HARBOR GATE 2', 'LDN-KLM-02', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.68.59', 8.12500000, 123.88500000, 'area-3'),
('site-op-060', 'DICT LANAO DEL NORTE LALA RURAL HEALTH UNIT 2', 'LDN-LLA-02', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.69.60', 7.95500000, 123.73500000, 'area-4'),
('site-op-061', 'DICT LANAO DEL NORTE SALVADOR TRAINING CENTER 2', 'LDN-SLV-02', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.70.61', 7.90500000, 123.85500000, 'area-5'),
('site-op-062', 'DICT LANAO DEL NORTE SULTAN NAGA DIMAPORO TERMINAL 2', 'LDN-SND-02', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.71.62', 7.76500000, 123.73500000, 'area-6'),
('site-op-063', 'DICT BUKIDNON MALAYBALAY CITY TECH WING 2', 'BUK-MLB-02', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.72.63', 8.16500000, 125.11500000, 'area-7'),
('site-op-064', 'DICT BUKIDNON VALENCIA CITY PUBLIC MARKET 2', 'BUK-VAL-02', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.73.64', 7.88500000, 125.10500000, 'area-8'),
('site-op-065', 'DICT BUKIDNON MARAMAG AGRI EXCHANGE 2', 'BUK-MRM-02', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.74.65', 7.76500000, 124.98500000, 'area-1'),
('site-op-066', 'DICT BUKIDNON QUEZON MUNICIPAL HALL 2', 'BUK-QZN-02', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.75.66', 7.71500000, 125.08500000, 'area-2'),
('site-op-067', 'DICT BUKIDNON DON CARLOS EMERGENCY CLINIC 2', 'BUK-DCL-02', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.76.67', 7.69500000, 125.01500000, 'area-3'),
('site-op-068', 'DICT BUKIDNON PANGANTUCAN SEED FACILITY 2', 'BUK-PNG-02', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.77.68', 7.80500000, 124.80500000, 'area-4'),
('site-op-069', 'DICT BUKIDNON TALAKAG MOUNTAIN RELAY 2', 'BUK-TLK-02', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.78.69', 8.24500000, 124.58500000, 'area-5'),
('site-op-070', 'DICT BUKIDNON BAUNGON WATERSHED POST 2', 'BUK-BNG-02', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.79.70', 8.33500000, 124.69500000, 'area-6'),
('site-op-071', 'DICT MISAMIS ORIENTAL CAGAYAN DE ORO CITY HALL 2', 'MOR-CDO-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.80.71', 8.49500000, 124.63500000, 'area-7'),
('site-op-072', 'DICT MISAMIS ORIENTAL GINGOOG CITY SEAPORT WARD 2', 'MOR-GNG-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.81.72', 8.80500000, 125.08500000, 'area-8'),
('site-op-073', 'DICT MISAMIS ORIENTAL EL SALVADOR INNOVATION PARK 2', 'MOR-ELS-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.82.73', 8.57500000, 124.53500000, 'area-1'),
('site-op-074', 'DICT MISAMIS ORIENTAL OPOL EVACUATION COMPLEX 2', 'MOR-OPL-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.83.74', 8.50500000, 124.55500000, 'area-2'),
('site-op-075', 'DICT MISAMIS ORIENTAL TAGOLOAN INDUSTRIAL TERMINAL 2', 'MOR-TGL-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.84.75', 8.55500000, 124.73500000, 'area-3'),
('site-op-076', 'DICT MISAMIS ORIENTAL VILLANUEVA POWER RELAY 2', 'MOR-VLN-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.85.76', 8.56500000, 124.78500000, 'area-4'),
('site-op-077', 'DICT MISAMIS ORIENTAL JASAAN SKILLS INSTITUTE 2', 'MOR-JSN-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.86.77', 8.66500000, 124.73500000, 'area-5'),
('site-op-078', 'DICT MISAMIS ORIENTAL BALINGASAG FISH PORT 2', 'MOR-BLS-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.87.78', 8.72500000, 124.75500000, 'area-6'),
('site-op-079', 'DICT MISAMIS ORIENTAL INITAO MUNICIPAL HALL 2', 'MOR-INT-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.88.79', 8.51500000, 124.31500000, 'area-7'),
('site-op-080', 'DICT MISAMIS ORIENTAL LUGAIT REVENUE TERMINAL 2', 'MOR-LGT-02', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.89.80', 8.32500000, 124.24500000, 'area-8'),
('site-op-081', 'DICT BARMM COTABATO CITY REGIONAL HQ 2', 'BARMM-COT-02', 'BARMM', 'BARMM', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.90.81', 7.23500000, 124.23500000, 'area-1'),
('site-op-082', 'DICT BARMM PARANG HARBOR DEPOT 2', 'BARMM-PRG-02', 'BARMM', 'BARMM', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.91.82', 7.35500000, 124.28500000, 'area-2'),
('site-op-083', 'DICT BARMM UPI COMMUNITY RADIO POST 2', 'BARMM-UPI-02', 'BARMM', 'BARMM', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.92.83', 7.04500000, 124.15500000, 'area-3'),
('site-op-084', 'DICT BARMM SULTAN KUDARAT ADMIN WING 2', 'BARMM-SKD-02', 'BARMM', 'BARMM', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.93.84', 7.22500000, 124.28500000, 'area-4'),
('site-op-085', 'DICT BARMM DATU ODIN SINSUAT HALL 2', 'BARMM-DOS-02', 'BARMM', 'BARMM', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.94.85', 7.18500000, 124.22500000, 'area-5'),
('site-op-086', 'DICT BARMM BULUAN PROVINCIAL CAPITOL 2', 'BARMM-BLN-02', 'BARMM', 'BARMM', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.95.86', 6.70500000, 124.78500000, 'area-6'),
('site-op-087', 'DICT BARMM PAGALUNGAN RIVERINE POST 2', 'BARMM-PGL-02', 'BARMM', 'BARMM', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.96.87', 7.06500000, 124.68500000, 'area-7'),
('site-op-088', 'DICT BARMM SHARIFF AGUAK EMERGENCY CENTER 2', 'BARMM-SHA-02', 'BARMM', 'BARMM', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.97.88', 6.84500000, 124.45500000, 'area-8'),
('site-op-089', 'DICT BARMM JOLO ISLAND CIVIC TERMINAL 2', 'BARMM-JLO-02', 'BARMM', 'BARMM', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.98.89', 6.06500000, 120.98500000, 'area-1'),
('site-op-090', 'DICT BARMM BONGAO SEAFRONT WARD 2', 'BARMM-BGO-02', 'BARMM', 'BARMM', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.99.90', 5.01500000, 119.75500000, 'area-2'),
('site-op-091', 'DICT BASILAN ISABELA CITY TECH DESK 2', 'BAS-ISA-02', 'BARMM', 'Basilan', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.100.91', 6.71500000, 121.98500000, 'area-3'),
('site-op-092', 'DICT BASILAN LAMITAN CITY CIVIC HALL 2', 'BAS-LAM-02', 'BARMM', 'Basilan', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.101.92', 6.63500000, 122.11500000, 'area-4'),
('site-op-093', 'DICT MISAMIS OCCIDENTAL OZAMIZ CITY PORT FACILITY 3', 'MO-OZA-03', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.102.93', 8.17000000, 123.81000000, 'area-5'),
('site-op-094', 'DICT MISAMIS OCCIDENTAL TANGUB CITY GOV CENTER 3', 'MO-TNG-03', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.103.94', 8.03000000, 123.78000000, 'area-6'),
('site-op-095', 'DICT MISAMIS OCCIDENTAL CLARIN MUNICIPAL LIBRARY 3', 'MO-CLR-03', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.104.95', 8.23000000, 123.82000000, 'area-7'),
('site-op-096', 'DICT MISAMIS OCCIDENTAL BONIFACIO COMM CENTER 3', 'MO-BON-03', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.105.96', 8.07000000, 123.57000000, 'area-8'),
('site-op-097', 'DICT MISAMIS OCCIDENTAL SINACABAN RHU FACILITY 3', 'MO-SNC-03', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.106.97', 8.31000000, 123.87000000, 'area-1'),
('site-op-098', 'DICT MISAMIS OCCIDENTAL LOPEZ JAENA DISPATCH 3', 'MO-LPJ-03', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.107.98', 8.50000000, 123.73000000, 'area-2'),
('site-op-099', 'DICT MISAMIS OCCIDENTAL BALIANGAO TECH HUB 3', 'MO-BLG-03', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.108.99', 8.69000000, 123.57000000, 'area-3'),
('site-op-100', 'DICT MISAMIS OCCIDENTAL SAPANG DALAGA HEALTH POST 3', 'MO-SPD-03', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.109.100', 8.52000000, 123.58000000, 'area-4'),
('site-op-101', 'DICT LANAO DEL NORTE ILIGAN CITY DISASTER OFFICE 3', 'LDN-ILG-03', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.110.101', 8.26000000, 124.22000000, 'area-5'),
('site-op-102', 'DICT LANAO DEL NORTE KAUSWAGAN PEACE COMPLEX 3', 'LDN-KSW-03', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.111.102', 8.13000000, 124.07000000, 'area-6'),
('site-op-103', 'DICT LANAO DEL NORTE BACOLOD MUNICIPAL HALL 3', 'LDN-BCD-03', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.112.103', 8.21000000, 124.04000000, 'area-7'),
('site-op-104', 'DICT LANAO DEL NORTE MAIGO CIVIC CENTER 3', 'LDN-MGO-03', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.113.104', 8.12000000, 123.92000000, 'area-8'),
('site-op-105', 'DICT LANAO DEL NORTE KOLAMBUGAN HARBOR GATE 3', 'LDN-KLM-03', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.114.105', 8.14000000, 123.87000000, 'area-1'),
('site-op-106', 'DICT LANAO DEL NORTE LALA RURAL HEALTH UNIT 3', 'LDN-LLA-03', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.115.106', 7.94000000, 123.78000000, 'area-2'),
('site-op-107', 'DICT LANAO DEL NORTE SALVADOR TRAINING CENTER 3', 'LDN-SLV-03', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.116.107', 7.92000000, 123.81000000, 'area-3'),
('site-op-108', 'DICT LANAO DEL NORTE SULTAN NAGA DIMAPORO TERMINAL 3', 'LDN-SND-03', 'Region X (Northern Mindanao)', 'Lanao del Norte', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.117.108', 7.75000000, 123.72000000, 'area-4'),
('site-op-109', 'DICT BUKIDNON MALAYBALAY CITY TECH WING 3', 'BUK-MLB-03', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.118.109', 8.18000000, 125.16000000, 'area-5'),
('site-op-110', 'DICT BUKIDNON VALENCIA CITY PUBLIC MARKET 3', 'BUK-VAL-03', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.119.110', 7.87000000, 125.06000000, 'area-6'),
('site-op-111', 'DICT BUKIDNON MARAMAG AGRI EXCHANGE 3', 'BUK-MRM-03', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.120.111', 7.78000000, 124.97000000, 'area-7'),
('site-op-112', 'DICT BUKIDNON QUEZON MUNICIPAL HALL 3', 'BUK-QZN-03', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.121.112', 7.70000000, 125.13000000, 'area-8'),
('site-op-113', 'DICT BUKIDNON DON CARLOS EMERGENCY CLINIC 3', 'BUK-DCL-03', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.122.113', 7.71000000, 124.97000000, 'area-1'),
('site-op-114', 'DICT BUKIDNON PANGANTUCAN SEED FACILITY 3', 'BUK-PNG-03', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.123.114', 7.79000000, 124.79000000, 'area-2'),
('site-op-115', 'DICT BUKIDNON TALAKAG MOUNTAIN RELAY 3', 'BUK-TLK-03', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.124.115', 8.26000000, 124.63000000, 'area-3'),
('site-op-116', 'DICT BUKIDNON BAUNGON WATERSHED POST 3', 'BUK-BNG-03', 'Region X (Northern Mindanao)', 'Bukidnon', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.125.116', 8.32000000, 124.65000000, 'area-4'),
('site-op-117', 'DICT MISAMIS ORIENTAL CAGAYAN DE ORO CITY HALL 3', 'MOR-CDO-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.126.117', 8.51000000, 124.62000000, 'area-5'),
('site-op-118', 'DICT MISAMIS ORIENTAL GINGOOG CITY SEAPORT WARD 3', 'MOR-GNG-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.127.118', 8.79000000, 125.13000000, 'area-6'),
('site-op-119', 'DICT MISAMIS ORIENTAL EL SALVADOR INNOVATION PARK 3', 'MOR-ELS-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.128.119', 8.59000000, 124.49000000, 'area-7'),
('site-op-120', 'DICT MISAMIS ORIENTAL OPOL EVACUATION COMPLEX 3', 'MOR-OPL-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.129.120', 8.49000000, 124.54000000, 'area-8'),
('site-op-121', 'DICT MISAMIS ORIENTAL TAGOLOAN INDUSTRIAL TERMINAL 3', 'MOR-TGL-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.10.121', 8.57000000, 124.78000000, 'area-1'),
('site-op-122', 'DICT MISAMIS ORIENTAL VILLANUEVA POWER RELAY 3', 'MOR-VLN-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.11.122', 8.55000000, 124.74000000, 'area-2'),
('site-op-123', 'DICT MISAMIS ORIENTAL JASAAN SKILLS INSTITUTE 3', 'MOR-JSN-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.12.123', 8.68000000, 124.72000000, 'area-3'),
('site-op-124', 'DICT MISAMIS ORIENTAL BALINGASAG FISH PORT 3', 'MOR-BLS-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.13.124', 8.71000000, 124.80000000, 'area-4'),
('site-op-125', 'DICT MISAMIS ORIENTAL INITAO MUNICIPAL HALL 3', 'MOR-INT-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.14.125', 8.53000000, 124.27000000, 'area-5'),
('site-op-126', 'DICT MISAMIS ORIENTAL LUGAIT REVENUE TERMINAL 3', 'MOR-LGT-03', 'Region X (Northern Mindanao)', 'Misamis Oriental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.15.126', 8.31000000, 124.23000000, 'area-6'),
('site-op-127', 'DICT BARMM COTABATO CITY REGIONAL HQ 3', 'BARMM-COT-03', 'BARMM', 'BARMM', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.16.127', 7.25000000, 124.28000000, 'area-7'),
('site-op-128', 'DICT BARMM PARANG HARBOR DEPOT 3', 'BARMM-PRG-03', 'BARMM', 'BARMM', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.17.128', 7.34000000, 124.24000000, 'area-8'),
('site-op-129', 'DICT BARMM UPI COMMUNITY RADIO POST 3', 'BARMM-UPI-03', 'BARMM', 'BARMM', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.18.129', 7.06000000, 124.14000000, 'area-1'),
('site-op-130', 'DICT BARMM SULTAN KUDARAT ADMIN WING 3', 'BARMM-SKD-03', 'BARMM', 'BARMM', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.19.130', 7.21000000, 124.33000000, 'area-2'),
('site-op-131', 'DICT BARMM DATU ODIN SINSUAT HALL 3', 'BARMM-DOS-03', 'BARMM', 'BARMM', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.20.131', 7.20000000, 124.18000000, 'area-3'),
('site-op-132', 'DICT BARMM BULUAN PROVINCIAL CAPITOL 3', 'BARMM-BLN-03', 'BARMM', 'BARMM', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.21.132', 6.69000000, 124.77000000, 'area-4'),
('site-op-133', 'DICT BARMM PAGALUNGAN RIVERINE POST 3', 'BARMM-PGL-03', 'BARMM', 'BARMM', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.22.133', 7.08000000, 124.73000000, 'area-5'),
('site-op-134', 'DICT BARMM SHARIFF AGUAK EMERGENCY CENTER 3', 'BARMM-SHA-03', 'BARMM', 'BARMM', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.23.134', 6.83000000, 124.41000000, 'area-6'),
('site-op-135', 'DICT BARMM JOLO ISLAND CIVIC TERMINAL 3', 'BARMM-JLO-03', 'BARMM', 'BARMM', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.24.135', 6.08000000, 120.97000000, 'area-7'),
('site-op-136', 'DICT BARMM BONGAO SEAFRONT WARD 3', 'BARMM-BGO-03', 'BARMM', 'BARMM', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.25.136', 5.00000000, 119.80000000, 'area-8'),
('site-op-137', 'DICT BASILAN ISABELA CITY TECH DESK 3', 'BAS-ISA-03', 'BARMM', 'Basilan', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.26.137', 6.73000000, 121.94000000, 'area-1'),
('site-op-138', 'DICT BASILAN LAMITAN CITY CIVIC HALL 3', 'BAS-LAM-03', 'BARMM', 'Basilan', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.27.138', 6.62000000, 122.10000000, 'area-2'),
('site-op-139', 'DICT MISAMIS OCCIDENTAL OZAMIZ CITY PORT FACILITY 4', 'MO-OZA-04', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.28.139', 8.18500000, 123.88500000, 'area-3'),
('site-op-140', 'DICT MISAMIS OCCIDENTAL TANGUB CITY GOV CENTER 4', 'MO-TNG-04', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 6, 0, 6, 0, NULL, NULL, NULL, '10.144.29.140', 8.01500000, 123.70500000, 'area-4'),
('site-op-141', 'DICT MISAMIS OCCIDENTAL CLARIN MUNICIPAL LIBRARY 4', 'MO-CLR-04', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 2, 0, 2, 0, NULL, NULL, NULL, '10.144.30.141', 8.24500000, 123.80500000, 'area-5'),
('site-op-142', 'DICT MISAMIS OCCIDENTAL BONIFACIO COMM CENTER 4', 'MO-BON-04', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 3, 0, 3, 0, NULL, NULL, NULL, '10.144.31.142', 8.05500000, 123.64500000, 'area-6'),
('site-op-143', 'DICT MISAMIS OCCIDENTAL SINACABAN RHU FACILITY 4', 'MO-SNC-04', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 4, 0, 4, 0, NULL, NULL, NULL, '10.144.32.143', 8.32500000, 123.79500000, 'area-7'),
('site-op-144', 'DICT MISAMIS OCCIDENTAL LOPEZ JAENA DISPATCH 4', 'MO-LPJ-04', 'Region X (Northern Mindanao)', 'Misamis Occidental', 'Operational', 5, 0, 5, 0, NULL, NULL, NULL, '10.144.33.144', 8.48500000, 123.71500000, 'area-8')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 4. Downtime Incidents & Alarms (Active Regional Outages)
INSERT INTO `downtime_events` (`id`, `site_id`, `alarm_type`, `severity`, `status`, `generated_at`, `duration_seconds`, `affected_device_count`, `offline_device_count`, `last_known_ip`, `assigned_handler_id`) VALUES
('evt-site-01', 'site-01', 'All device offline', 'Critical', 'Active', NOW() - INTERVAL 1380 SECOND, 1380, 4, 4, '10.144.12.1', 'area-1'),
('evt-site-02', 'site-02', '1 of 4 AP offline', 'Moderate', 'Active', NOW() - INTERVAL 2760 SECOND, 2760, 4, 1, '10.145.88.14', 'area-2'),
('evt-site-03', 'site-03', '2 of 4 AP offline', 'Moderate', 'Active', NOW() - INTERVAL 5100 SECOND, 5100, 4, 2, '10.144.19.4', 'area-3'),
('evt-site-04', 'site-04', 'All device offline', 'Critical', 'Active', NOW() - INTERVAL 7380 SECOND, 7380, 5, 5, '10.145.102.1', 'area-4'),
('evt-site-05', 'site-05', '1 of 4 AP offline', 'Moderate', 'Active', NOW() - INTERVAL 9120 SECOND, 9120, 4, 1, '10.144.33.1', 'area-5'),
('evt-site-06', 'site-06', 'All device offline', 'Critical', 'Active', NOW() - INTERVAL 14700 SECOND, 14700, 6, 6, '10.148.05.20', 'area-6'),
('evt-site-07', 'site-07', '2 of 4 AP offline', 'Moderate', 'Active', NOW() - INTERVAL 17220 SECOND, 17220, 4, 2, '10.144.52.1', 'area-1'),
('evt-site-08', 'site-08', 'All device offline', 'Critical', 'Active', NOW() - INTERVAL 22500 SECOND, 22500, 8, 8, '10.150.12.8', 'area-5')
ON DUPLICATE KEY UPDATE `alarm_type`=VALUES(`alarm_type`);

-- 5. Hardware Equipment (Gateways, Switches & Reyee APs)
INSERT INTO `devices` (`id`, `site_id`, `device_name`, `model`, `serial_number`, `mac_address`, `ip_address`, `device_type`, `status`) VALUES
('dev-site-01-ap1', 'site-01', 'DICT MIS OCC OROQUIETA CITY HALL I - AP 1', 'RG-RAP2260(G)', 'RG-AP-MO-ORQ-01-1', '50:D2:F5:01:02:01', '10.144.12.2', 'AccessPoint', 'Offline'),
('dev-site-01-ap2', 'site-01', 'DICT MIS OCC OROQUIETA CITY HALL I - AP 2', 'RG-RAP2260(G)', 'RG-AP-MO-ORQ-01-2', '50:D2:F5:01:02:02', '10.144.12.3', 'AccessPoint', 'Offline'),
('dev-site-01-ap3', 'site-01', 'DICT MIS OCC OROQUIETA CITY HALL I - AP 3', 'RG-RAP2260(G)', 'RG-AP-MO-ORQ-01-3', '50:D2:F5:01:02:03', '10.144.12.4', 'AccessPoint', 'Offline'),
('dev-site-01-gw', 'site-01', 'DICT MIS OCC OROQUIETA CITY HALL I - Gateway', 'RG-EG310G-E', 'RG-GW-MO-ORQ-01', '50:D2:F5:01:01:00', '10.144.12.1', 'Gateway', 'Offline'),
('dev-site-02-ap1', 'site-02', 'DICT PICS NUNUNGAN - AP 1', 'RG-RAP2260(G)', 'RG-AP-LDN-NUN-01-1', '50:D2:F5:02:02:01', '10.145.88.12', 'AccessPoint', 'Offline'),
('dev-site-02-ap2', 'site-02', 'DICT PICS NUNUNGAN - AP 2', 'RG-RAP2260(G)', 'RG-AP-LDN-NUN-01-2', '50:D2:F5:02:02:02', '10.145.88.13', 'AccessPoint', 'Online'),
('dev-site-02-ap3', 'site-02', 'DICT PICS NUNUNGAN - AP 3', 'RG-RAP2260(G)', 'RG-AP-LDN-NUN-01-3', '50:D2:F5:02:02:03', '10.145.88.14', 'AccessPoint', 'Online'),
('dev-site-02-gw', 'site-02', 'DICT PICS NUNUNGAN - Gateway', 'RG-EG310G-E', 'RG-GW-LDN-NUN-01', '50:D2:F5:02:01:00', '10.145.88.14', 'Gateway', 'Online'),
('dev-site-03-ap1', 'site-03', 'DICT MIS OCC ALORAN MUNICIPAL HALL - AP 1', 'RG-RAP2260(G)', 'RG-AP-MO-ALR-01-1', '50:D2:F5:03:02:01', '10.144.19.2', 'AccessPoint', 'Offline'),
('dev-site-03-ap2', 'site-03', 'DICT MIS OCC ALORAN MUNICIPAL HALL - AP 2', 'RG-RAP2260(G)', 'RG-AP-MO-ALR-01-2', '50:D2:F5:03:02:02', '10.144.19.3', 'AccessPoint', 'Offline'),
('dev-site-03-ap3', 'site-03', 'DICT MIS OCC ALORAN MUNICIPAL HALL - AP 3', 'RG-RAP2260(G)', 'RG-AP-MO-ALR-01-3', '50:D2:F5:03:02:03', '10.144.19.4', 'AccessPoint', 'Online'),
('dev-site-03-gw', 'site-03', 'DICT MIS OCC ALORAN MUNICIPAL HALL - Gateway', 'RG-EG310G-E', 'RG-GW-MO-ALR-01', '50:D2:F5:03:01:00', '10.144.19.4', 'Gateway', 'Online'),
('dev-site-04-ap1', 'site-04', 'DICT LANAO DEL NORTE BALOI POBLACION - AP 1', 'RG-RAP2260(G)', 'RG-AP-LDN-BAL-02-1', '50:D2:F5:04:02:01', '10.145.102.2', 'AccessPoint', 'Offline'),
('dev-site-04-ap2', 'site-04', 'DICT LANAO DEL NORTE BALOI POBLACION - AP 2', 'RG-RAP2260(G)', 'RG-AP-LDN-BAL-02-2', '50:D2:F5:04:02:02', '10.145.102.3', 'AccessPoint', 'Offline'),
('dev-site-04-ap3', 'site-04', 'DICT LANAO DEL NORTE BALOI POBLACION - AP 3', 'RG-RAP2260(G)', 'RG-AP-LDN-BAL-02-3', '50:D2:F5:04:02:03', '10.145.102.4', 'AccessPoint', 'Offline'),
('dev-site-04-ap4', 'site-04', 'DICT LANAO DEL NORTE BALOI POBLACION - AP 4', 'RG-RAP2260(G)', 'RG-AP-LDN-BAL-02-4', '50:D2:F5:04:02:04', '10.145.102.5', 'AccessPoint', 'Offline'),
('dev-site-04-gw', 'site-04', 'DICT LANAO DEL NORTE BALOI POBLACION - Gateway', 'RG-EG310G-E', 'RG-GW-LDN-BAL-02', '50:D2:F5:04:01:00', '10.145.102.1', 'Gateway', 'Offline'),
('dev-site-05-ap1', 'site-05', 'DICT MIS OCC JIMENEZ RHU II - AP 1', 'RG-RAP2260(G)', 'RG-AP-MO-JIM-02-1', '50:D2:F5:05:02:01', '10.144.33.2', 'AccessPoint', 'Offline'),
('dev-site-05-ap2', 'site-05', 'DICT MIS OCC JIMENEZ RHU II - AP 2', 'RG-RAP2260(G)', 'RG-AP-MO-JIM-02-2', '50:D2:F5:05:02:02', '10.144.33.3', 'AccessPoint', 'Online'),
('dev-site-05-ap3', 'site-05', 'DICT MIS OCC JIMENEZ RHU II - AP 3', 'RG-RAP2260(G)', 'RG-AP-MO-JIM-02-3', '50:D2:F5:05:02:03', '10.144.33.4', 'AccessPoint', 'Online'),
('dev-site-05-gw', 'site-05', 'DICT MIS OCC JIMENEZ RHU II - Gateway', 'RG-EG310G-E', 'RG-GW-MO-JIM-02', '50:D2:F5:05:01:00', '10.144.33.1', 'Gateway', 'Online'),
('dev-site-06-ap1', 'site-06', 'DICT BUKIDNON MALITBOG MUNICIPAL BLDG - AP 1', 'RG-RAP2260(G)', 'RG-AP-BUK-MAL-01-1', '50:D2:F5:06:02:01', '10.148.05.22', 'AccessPoint', 'Offline'),
('dev-site-06-ap2', 'site-06', 'DICT BUKIDNON MALITBOG MUNICIPAL BLDG - AP 2', 'RG-RAP2260(G)', 'RG-AP-BUK-MAL-01-2', '50:D2:F5:06:02:02', '10.148.05.23', 'AccessPoint', 'Offline'),
('dev-site-06-ap3', 'site-06', 'DICT BUKIDNON MALITBOG MUNICIPAL BLDG - AP 3', 'RG-RAP2260(G)', 'RG-AP-BUK-MAL-01-3', '50:D2:F5:06:02:03', '10.148.05.24', 'AccessPoint', 'Offline'),
('dev-site-06-ap4', 'site-06', 'DICT BUKIDNON MALITBOG MUNICIPAL BLDG - AP 4', 'RG-RAP2260(G)', 'RG-AP-BUK-MAL-01-4', '50:D2:F5:06:02:04', '10.148.05.25', 'AccessPoint', 'Offline'),
('dev-site-06-ap5', 'site-06', 'DICT BUKIDNON MALITBOG MUNICIPAL BLDG - AP 5', 'RG-RAP2260(G)', 'RG-AP-BUK-MAL-01-5', '50:D2:F5:06:02:05', '10.148.05.26', 'AccessPoint', 'Offline'),
('dev-site-06-gw', 'site-06', 'DICT BUKIDNON MALITBOG MUNICIPAL BLDG - Gateway', 'RG-EG310G-E', 'RG-GW-BUK-MAL-01', '50:D2:F5:06:01:00', '10.148.05.20', 'Gateway', 'Offline'),
('dev-site-07-ap1', 'site-07', 'DICT MIS OCC TUDELA MUNICIPAL HALL - AP 1', 'RG-RAP2260(G)', 'RG-AP-MO-TUD-01-1', '50:D2:F5:07:02:01', '10.144.52.2', 'AccessPoint', 'Offline'),
('dev-site-07-ap2', 'site-07', 'DICT MIS OCC TUDELA MUNICIPAL HALL - AP 2', 'RG-RAP2260(G)', 'RG-AP-MO-TUD-01-2', '50:D2:F5:07:02:02', '10.144.52.3', 'AccessPoint', 'Offline'),
('dev-site-07-ap3', 'site-07', 'DICT MIS OCC TUDELA MUNICIPAL HALL - AP 3', 'RG-RAP2260(G)', 'RG-AP-MO-TUD-01-3', '50:D2:F5:07:02:03', '10.144.52.4', 'AccessPoint', 'Online'),
('dev-site-07-gw', 'site-07', 'DICT MIS OCC TUDELA MUNICIPAL HALL - Gateway', 'RG-EG310G-E', 'RG-GW-MO-TUD-01', '50:D2:F5:07:01:00', '10.144.52.1', 'Gateway', 'Online'),
('dev-site-08-ap1', 'site-08', 'DICT LANAO DEL SUR MARAWI CITY CAPITOL - AP 1', 'RG-RAP2260(G)', 'RG-AP-BARMM-MAR-01-1', '50:D2:F5:08:02:01', '10.150.12.2', 'AccessPoint', 'Offline'),
('dev-site-08-ap2', 'site-08', 'DICT LANAO DEL SUR MARAWI CITY CAPITOL - AP 2', 'RG-RAP2260(G)', 'RG-AP-BARMM-MAR-01-2', '50:D2:F5:08:02:02', '10.150.12.3', 'AccessPoint', 'Offline'),
('dev-site-08-ap3', 'site-08', 'DICT LANAO DEL SUR MARAWI CITY CAPITOL - AP 3', 'RG-RAP2260(G)', 'RG-AP-BARMM-MAR-01-3', '50:D2:F5:08:02:03', '10.150.12.4', 'AccessPoint', 'Offline'),
('dev-site-08-ap4', 'site-08', 'DICT LANAO DEL SUR MARAWI CITY CAPITOL - AP 4', 'RG-RAP2260(G)', 'RG-AP-BARMM-MAR-01-4', '50:D2:F5:08:02:04', '10.150.12.5', 'AccessPoint', 'Offline'),
('dev-site-08-ap5', 'site-08', 'DICT LANAO DEL SUR MARAWI CITY CAPITOL - AP 5', 'RG-RAP2260(G)', 'RG-AP-BARMM-MAR-01-5', '50:D2:F5:08:02:05', '10.150.12.6', 'AccessPoint', 'Offline'),
('dev-site-08-ap6', 'site-08', 'DICT LANAO DEL SUR MARAWI CITY CAPITOL - AP 6', 'RG-RAP2260(G)', 'RG-AP-BARMM-MAR-01-6', '50:D2:F5:08:02:06', '10.150.12.7', 'AccessPoint', 'Offline'),
('dev-site-08-ap7', 'site-08', 'DICT LANAO DEL SUR MARAWI CITY CAPITOL - AP 7', 'RG-RAP2260(G)', 'RG-AP-BARMM-MAR-01-7', '50:D2:F5:08:02:07', '10.150.12.8', 'AccessPoint', 'Offline'),
('dev-site-08-gw', 'site-08', 'DICT LANAO DEL SUR MARAWI CITY CAPITOL - Gateway', 'RG-EG310G-E', 'RG-GW-BARMM-MAR-01', '50:D2:F5:08:01:00', '10.150.12.8', 'Gateway', 'Offline'),
('dev-site-op-001-gw', 'site-op-001', 'DICT MISAMIS OCCIDENTAL OZAMIZ CITY PORT FACILITY - Gateway', 'RG-EG210G-E', 'RG-GW-MO-OZA-01', '50:D2:F5:88:00:01', '10.144.10.1', 'Gateway', 'Online'),
('dev-site-op-002-gw', 'site-op-002', 'DICT MISAMIS OCCIDENTAL TANGUB CITY GOV CENTER - Gateway', 'RG-EG210G-E', 'RG-GW-MO-TNG-01', '50:D2:F5:88:00:02', '10.144.11.2', 'Gateway', 'Online'),
('dev-site-op-003-gw', 'site-op-003', 'DICT MISAMIS OCCIDENTAL CLARIN MUNICIPAL LIBRARY - Gateway', 'RG-EG210G-E', 'RG-GW-MO-CLR-01', '50:D2:F5:88:00:03', '10.144.12.3', 'Gateway', 'Online'),
('dev-site-op-004-gw', 'site-op-004', 'DICT MISAMIS OCCIDENTAL BONIFACIO COMM CENTER - Gateway', 'RG-EG210G-E', 'RG-GW-MO-BON-01', '50:D2:F5:88:00:04', '10.144.13.4', 'Gateway', 'Online'),
('dev-site-op-005-gw', 'site-op-005', 'DICT MISAMIS OCCIDENTAL SINACABAN RHU FACILITY - Gateway', 'RG-EG210G-E', 'RG-GW-MO-SNC-01', '50:D2:F5:88:00:05', '10.144.14.5', 'Gateway', 'Online'),
('dev-site-op-006-gw', 'site-op-006', 'DICT MISAMIS OCCIDENTAL LOPEZ JAENA DISPATCH - Gateway', 'RG-EG210G-E', 'RG-GW-MO-LPJ-01', '50:D2:F5:88:00:06', '10.144.15.6', 'Gateway', 'Online'),
('dev-site-op-007-gw', 'site-op-007', 'DICT MISAMIS OCCIDENTAL BALIANGAO TECH HUB - Gateway', 'RG-EG210G-E', 'RG-GW-MO-BLG-01', '50:D2:F5:88:00:07', '10.144.16.7', 'Gateway', 'Online'),
('dev-site-op-008-gw', 'site-op-008', 'DICT MISAMIS OCCIDENTAL SAPANG DALAGA HEALTH POST - Gateway', 'RG-EG210G-E', 'RG-GW-MO-SPD-01', '50:D2:F5:88:00:08', '10.144.17.8', 'Gateway', 'Online'),
('dev-site-op-009-gw', 'site-op-009', 'DICT LANAO DEL NORTE ILIGAN CITY DISASTER OFFICE - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-ILG-01', '50:D2:F5:88:00:09', '10.144.18.9', 'Gateway', 'Online'),
('dev-site-op-010-gw', 'site-op-010', 'DICT LANAO DEL NORTE KAUSWAGAN PEACE COMPLEX - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-KSW-01', '50:D2:F5:88:00:0a', '10.144.19.10', 'Gateway', 'Online'),
('dev-site-op-011-gw', 'site-op-011', 'DICT LANAO DEL NORTE BACOLOD MUNICIPAL HALL - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-BCD-01', '50:D2:F5:88:00:0b', '10.144.20.11', 'Gateway', 'Online'),
('dev-site-op-012-gw', 'site-op-012', 'DICT LANAO DEL NORTE MAIGO CIVIC CENTER - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-MGO-01', '50:D2:F5:88:00:0c', '10.144.21.12', 'Gateway', 'Online'),
('dev-site-op-013-gw', 'site-op-013', 'DICT LANAO DEL NORTE KOLAMBUGAN HARBOR GATE - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-KLM-01', '50:D2:F5:88:00:0d', '10.144.22.13', 'Gateway', 'Online'),
('dev-site-op-014-gw', 'site-op-014', 'DICT LANAO DEL NORTE LALA RURAL HEALTH UNIT - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-LLA-01', '50:D2:F5:88:00:0e', '10.144.23.14', 'Gateway', 'Online'),
('dev-site-op-015-gw', 'site-op-015', 'DICT LANAO DEL NORTE SALVADOR TRAINING CENTER - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-SLV-01', '50:D2:F5:88:00:0f', '10.144.24.15', 'Gateway', 'Online'),
('dev-site-op-016-gw', 'site-op-016', 'DICT LANAO DEL NORTE SULTAN NAGA DIMAPORO TERMINAL - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-SND-01', '50:D2:F5:88:00:10', '10.144.25.16', 'Gateway', 'Online'),
('dev-site-op-017-gw', 'site-op-017', 'DICT BUKIDNON MALAYBALAY CITY TECH WING - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-MLB-01', '50:D2:F5:88:00:11', '10.144.26.17', 'Gateway', 'Online'),
('dev-site-op-018-gw', 'site-op-018', 'DICT BUKIDNON VALENCIA CITY PUBLIC MARKET - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-VAL-01', '50:D2:F5:88:00:12', '10.144.27.18', 'Gateway', 'Online'),
('dev-site-op-019-gw', 'site-op-019', 'DICT BUKIDNON MARAMAG AGRI EXCHANGE - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-MRM-01', '50:D2:F5:88:00:13', '10.144.28.19', 'Gateway', 'Online'),
('dev-site-op-020-gw', 'site-op-020', 'DICT BUKIDNON QUEZON MUNICIPAL HALL - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-QZN-01', '50:D2:F5:88:00:14', '10.144.29.20', 'Gateway', 'Online'),
('dev-site-op-021-gw', 'site-op-021', 'DICT BUKIDNON DON CARLOS EMERGENCY CLINIC - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-DCL-01', '50:D2:F5:88:00:15', '10.144.30.21', 'Gateway', 'Online'),
('dev-site-op-022-gw', 'site-op-022', 'DICT BUKIDNON PANGANTUCAN SEED FACILITY - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-PNG-01', '50:D2:F5:88:00:16', '10.144.31.22', 'Gateway', 'Online'),
('dev-site-op-023-gw', 'site-op-023', 'DICT BUKIDNON TALAKAG MOUNTAIN RELAY - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-TLK-01', '50:D2:F5:88:00:17', '10.144.32.23', 'Gateway', 'Online'),
('dev-site-op-024-gw', 'site-op-024', 'DICT BUKIDNON BAUNGON WATERSHED POST - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-BNG-01', '50:D2:F5:88:00:18', '10.144.33.24', 'Gateway', 'Online'),
('dev-site-op-025-gw', 'site-op-025', 'DICT MISAMIS ORIENTAL CAGAYAN DE ORO CITY HALL - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-CDO-01', '50:D2:F5:88:00:19', '10.144.34.25', 'Gateway', 'Online'),
('dev-site-op-026-gw', 'site-op-026', 'DICT MISAMIS ORIENTAL GINGOOG CITY SEAPORT WARD - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-GNG-01', '50:D2:F5:88:00:1a', '10.144.35.26', 'Gateway', 'Online'),
('dev-site-op-027-gw', 'site-op-027', 'DICT MISAMIS ORIENTAL EL SALVADOR INNOVATION PARK - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-ELS-01', '50:D2:F5:88:00:1b', '10.144.36.27', 'Gateway', 'Online'),
('dev-site-op-028-gw', 'site-op-028', 'DICT MISAMIS ORIENTAL OPOL EVACUATION COMPLEX - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-OPL-01', '50:D2:F5:88:00:1c', '10.144.37.28', 'Gateway', 'Online'),
('dev-site-op-029-gw', 'site-op-029', 'DICT MISAMIS ORIENTAL TAGOLOAN INDUSTRIAL TERMINAL - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-TGL-01', '50:D2:F5:88:00:1d', '10.144.38.29', 'Gateway', 'Online'),
('dev-site-op-030-gw', 'site-op-030', 'DICT MISAMIS ORIENTAL VILLANUEVA POWER RELAY - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-VLN-01', '50:D2:F5:88:00:1e', '10.144.39.30', 'Gateway', 'Online'),
('dev-site-op-031-gw', 'site-op-031', 'DICT MISAMIS ORIENTAL JASAAN SKILLS INSTITUTE - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-JSN-01', '50:D2:F5:88:00:1f', '10.144.40.31', 'Gateway', 'Online'),
('dev-site-op-032-gw', 'site-op-032', 'DICT MISAMIS ORIENTAL BALINGASAG FISH PORT - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-BLS-01', '50:D2:F5:88:00:20', '10.144.41.32', 'Gateway', 'Online'),
('dev-site-op-033-gw', 'site-op-033', 'DICT MISAMIS ORIENTAL INITAO MUNICIPAL HALL - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-INT-01', '50:D2:F5:88:00:21', '10.144.42.33', 'Gateway', 'Online'),
('dev-site-op-034-gw', 'site-op-034', 'DICT MISAMIS ORIENTAL LUGAIT REVENUE TERMINAL - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-LGT-01', '50:D2:F5:88:00:22', '10.144.43.34', 'Gateway', 'Online'),
('dev-site-op-035-gw', 'site-op-035', 'DICT BARMM COTABATO CITY REGIONAL HQ - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-COT-01', '50:D2:F5:88:00:23', '10.144.44.35', 'Gateway', 'Online'),
('dev-site-op-036-gw', 'site-op-036', 'DICT BARMM PARANG HARBOR DEPOT - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-PRG-01', '50:D2:F5:88:00:24', '10.144.45.36', 'Gateway', 'Online'),
('dev-site-op-037-gw', 'site-op-037', 'DICT BARMM UPI COMMUNITY RADIO POST - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-UPI-01', '50:D2:F5:88:00:25', '10.144.46.37', 'Gateway', 'Online'),
('dev-site-op-038-gw', 'site-op-038', 'DICT BARMM SULTAN KUDARAT ADMIN WING - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-SKD-01', '50:D2:F5:88:00:26', '10.144.47.38', 'Gateway', 'Online'),
('dev-site-op-039-gw', 'site-op-039', 'DICT BARMM DATU ODIN SINSUAT HALL - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-DOS-01', '50:D2:F5:88:00:27', '10.144.48.39', 'Gateway', 'Online'),
('dev-site-op-040-gw', 'site-op-040', 'DICT BARMM BULUAN PROVINCIAL CAPITOL - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-BLN-01', '50:D2:F5:88:00:28', '10.144.49.40', 'Gateway', 'Online'),
('dev-site-op-041-gw', 'site-op-041', 'DICT BARMM PAGALUNGAN RIVERINE POST - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-PGL-01', '50:D2:F5:88:00:29', '10.144.50.41', 'Gateway', 'Online'),
('dev-site-op-042-gw', 'site-op-042', 'DICT BARMM SHARIFF AGUAK EMERGENCY CENTER - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-SHA-01', '50:D2:F5:88:00:2a', '10.144.51.42', 'Gateway', 'Online'),
('dev-site-op-043-gw', 'site-op-043', 'DICT BARMM JOLO ISLAND CIVIC TERMINAL - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-JLO-01', '50:D2:F5:88:00:2b', '10.144.52.43', 'Gateway', 'Online'),
('dev-site-op-044-gw', 'site-op-044', 'DICT BARMM BONGAO SEAFRONT WARD - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-BGO-01', '50:D2:F5:88:00:2c', '10.144.53.44', 'Gateway', 'Online'),
('dev-site-op-045-gw', 'site-op-045', 'DICT BASILAN ISABELA CITY TECH DESK - Gateway', 'RG-EG210G-E', 'RG-GW-BAS-ISA-01', '50:D2:F5:88:00:2d', '10.144.54.45', 'Gateway', 'Online'),
('dev-site-op-046-gw', 'site-op-046', 'DICT BASILAN LAMITAN CITY CIVIC HALL - Gateway', 'RG-EG210G-E', 'RG-GW-BAS-LAM-01', '50:D2:F5:88:00:2e', '10.144.55.46', 'Gateway', 'Online'),
('dev-site-op-047-gw', 'site-op-047', 'DICT MISAMIS OCCIDENTAL OZAMIZ CITY PORT FACILITY 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-OZA-02', '50:D2:F5:88:00:2f', '10.144.56.47', 'Gateway', 'Online'),
('dev-site-op-048-gw', 'site-op-048', 'DICT MISAMIS OCCIDENTAL TANGUB CITY GOV CENTER 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-TNG-02', '50:D2:F5:88:00:30', '10.144.57.48', 'Gateway', 'Online'),
('dev-site-op-049-gw', 'site-op-049', 'DICT MISAMIS OCCIDENTAL CLARIN MUNICIPAL LIBRARY 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-CLR-02', '50:D2:F5:88:00:31', '10.144.58.49', 'Gateway', 'Online'),
('dev-site-op-050-gw', 'site-op-050', 'DICT MISAMIS OCCIDENTAL BONIFACIO COMM CENTER 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-BON-02', '50:D2:F5:88:00:32', '10.144.59.50', 'Gateway', 'Online'),
('dev-site-op-051-gw', 'site-op-051', 'DICT MISAMIS OCCIDENTAL SINACABAN RHU FACILITY 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-SNC-02', '50:D2:F5:88:00:33', '10.144.60.51', 'Gateway', 'Online'),
('dev-site-op-052-gw', 'site-op-052', 'DICT MISAMIS OCCIDENTAL LOPEZ JAENA DISPATCH 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-LPJ-02', '50:D2:F5:88:00:34', '10.144.61.52', 'Gateway', 'Online'),
('dev-site-op-053-gw', 'site-op-053', 'DICT MISAMIS OCCIDENTAL BALIANGAO TECH HUB 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-BLG-02', '50:D2:F5:88:00:35', '10.144.62.53', 'Gateway', 'Online'),
('dev-site-op-054-gw', 'site-op-054', 'DICT MISAMIS OCCIDENTAL SAPANG DALAGA HEALTH POST 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-SPD-02', '50:D2:F5:88:00:36', '10.144.63.54', 'Gateway', 'Online'),
('dev-site-op-055-gw', 'site-op-055', 'DICT LANAO DEL NORTE ILIGAN CITY DISASTER OFFICE 2 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-ILG-02', '50:D2:F5:88:00:37', '10.144.64.55', 'Gateway', 'Online'),
('dev-site-op-056-gw', 'site-op-056', 'DICT LANAO DEL NORTE KAUSWAGAN PEACE COMPLEX 2 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-KSW-02', '50:D2:F5:88:00:38', '10.144.65.56', 'Gateway', 'Online'),
('dev-site-op-057-gw', 'site-op-057', 'DICT LANAO DEL NORTE BACOLOD MUNICIPAL HALL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-BCD-02', '50:D2:F5:88:00:39', '10.144.66.57', 'Gateway', 'Online'),
('dev-site-op-058-gw', 'site-op-058', 'DICT LANAO DEL NORTE MAIGO CIVIC CENTER 2 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-MGO-02', '50:D2:F5:88:00:3a', '10.144.67.58', 'Gateway', 'Online'),
('dev-site-op-059-gw', 'site-op-059', 'DICT LANAO DEL NORTE KOLAMBUGAN HARBOR GATE 2 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-KLM-02', '50:D2:F5:88:00:3b', '10.144.68.59', 'Gateway', 'Online'),
('dev-site-op-060-gw', 'site-op-060', 'DICT LANAO DEL NORTE LALA RURAL HEALTH UNIT 2 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-LLA-02', '50:D2:F5:88:00:3c', '10.144.69.60', 'Gateway', 'Online'),
('dev-site-op-061-gw', 'site-op-061', 'DICT LANAO DEL NORTE SALVADOR TRAINING CENTER 2 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-SLV-02', '50:D2:F5:88:00:3d', '10.144.70.61', 'Gateway', 'Online'),
('dev-site-op-062-gw', 'site-op-062', 'DICT LANAO DEL NORTE SULTAN NAGA DIMAPORO TERMINAL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-SND-02', '50:D2:F5:88:00:3e', '10.144.71.62', 'Gateway', 'Online'),
('dev-site-op-063-gw', 'site-op-063', 'DICT BUKIDNON MALAYBALAY CITY TECH WING 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-MLB-02', '50:D2:F5:88:00:3f', '10.144.72.63', 'Gateway', 'Online'),
('dev-site-op-064-gw', 'site-op-064', 'DICT BUKIDNON VALENCIA CITY PUBLIC MARKET 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-VAL-02', '50:D2:F5:88:00:40', '10.144.73.64', 'Gateway', 'Online'),
('dev-site-op-065-gw', 'site-op-065', 'DICT BUKIDNON MARAMAG AGRI EXCHANGE 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-MRM-02', '50:D2:F5:88:00:41', '10.144.74.65', 'Gateway', 'Online'),
('dev-site-op-066-gw', 'site-op-066', 'DICT BUKIDNON QUEZON MUNICIPAL HALL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-QZN-02', '50:D2:F5:88:00:42', '10.144.75.66', 'Gateway', 'Online'),
('dev-site-op-067-gw', 'site-op-067', 'DICT BUKIDNON DON CARLOS EMERGENCY CLINIC 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-DCL-02', '50:D2:F5:88:00:43', '10.144.76.67', 'Gateway', 'Online'),
('dev-site-op-068-gw', 'site-op-068', 'DICT BUKIDNON PANGANTUCAN SEED FACILITY 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-PNG-02', '50:D2:F5:88:00:44', '10.144.77.68', 'Gateway', 'Online'),
('dev-site-op-069-gw', 'site-op-069', 'DICT BUKIDNON TALAKAG MOUNTAIN RELAY 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-TLK-02', '50:D2:F5:88:00:45', '10.144.78.69', 'Gateway', 'Online'),
('dev-site-op-070-gw', 'site-op-070', 'DICT BUKIDNON BAUNGON WATERSHED POST 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-BNG-02', '50:D2:F5:88:00:46', '10.144.79.70', 'Gateway', 'Online'),
('dev-site-op-071-gw', 'site-op-071', 'DICT MISAMIS ORIENTAL CAGAYAN DE ORO CITY HALL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-CDO-02', '50:D2:F5:88:00:47', '10.144.80.71', 'Gateway', 'Online'),
('dev-site-op-072-gw', 'site-op-072', 'DICT MISAMIS ORIENTAL GINGOOG CITY SEAPORT WARD 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-GNG-02', '50:D2:F5:88:00:48', '10.144.81.72', 'Gateway', 'Online'),
('dev-site-op-073-gw', 'site-op-073', 'DICT MISAMIS ORIENTAL EL SALVADOR INNOVATION PARK 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-ELS-02', '50:D2:F5:88:00:49', '10.144.82.73', 'Gateway', 'Online'),
('dev-site-op-074-gw', 'site-op-074', 'DICT MISAMIS ORIENTAL OPOL EVACUATION COMPLEX 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-OPL-02', '50:D2:F5:88:00:4a', '10.144.83.74', 'Gateway', 'Online'),
('dev-site-op-075-gw', 'site-op-075', 'DICT MISAMIS ORIENTAL TAGOLOAN INDUSTRIAL TERMINAL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-TGL-02', '50:D2:F5:88:00:4b', '10.144.84.75', 'Gateway', 'Online'),
('dev-site-op-076-gw', 'site-op-076', 'DICT MISAMIS ORIENTAL VILLANUEVA POWER RELAY 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-VLN-02', '50:D2:F5:88:00:4c', '10.144.85.76', 'Gateway', 'Online'),
('dev-site-op-077-gw', 'site-op-077', 'DICT MISAMIS ORIENTAL JASAAN SKILLS INSTITUTE 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-JSN-02', '50:D2:F5:88:00:4d', '10.144.86.77', 'Gateway', 'Online'),
('dev-site-op-078-gw', 'site-op-078', 'DICT MISAMIS ORIENTAL BALINGASAG FISH PORT 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-BLS-02', '50:D2:F5:88:00:4e', '10.144.87.78', 'Gateway', 'Online'),
('dev-site-op-079-gw', 'site-op-079', 'DICT MISAMIS ORIENTAL INITAO MUNICIPAL HALL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-INT-02', '50:D2:F5:88:00:4f', '10.144.88.79', 'Gateway', 'Online'),
('dev-site-op-080-gw', 'site-op-080', 'DICT MISAMIS ORIENTAL LUGAIT REVENUE TERMINAL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-LGT-02', '50:D2:F5:88:00:50', '10.144.89.80', 'Gateway', 'Online'),
('dev-site-op-081-gw', 'site-op-081', 'DICT BARMM COTABATO CITY REGIONAL HQ 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-COT-02', '50:D2:F5:88:00:51', '10.144.90.81', 'Gateway', 'Online'),
('dev-site-op-082-gw', 'site-op-082', 'DICT BARMM PARANG HARBOR DEPOT 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-PRG-02', '50:D2:F5:88:00:52', '10.144.91.82', 'Gateway', 'Online'),
('dev-site-op-083-gw', 'site-op-083', 'DICT BARMM UPI COMMUNITY RADIO POST 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-UPI-02', '50:D2:F5:88:00:53', '10.144.92.83', 'Gateway', 'Online'),
('dev-site-op-084-gw', 'site-op-084', 'DICT BARMM SULTAN KUDARAT ADMIN WING 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-SKD-02', '50:D2:F5:88:00:54', '10.144.93.84', 'Gateway', 'Online'),
('dev-site-op-085-gw', 'site-op-085', 'DICT BARMM DATU ODIN SINSUAT HALL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-DOS-02', '50:D2:F5:88:00:55', '10.144.94.85', 'Gateway', 'Online'),
('dev-site-op-086-gw', 'site-op-086', 'DICT BARMM BULUAN PROVINCIAL CAPITOL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-BLN-02', '50:D2:F5:88:00:56', '10.144.95.86', 'Gateway', 'Online'),
('dev-site-op-087-gw', 'site-op-087', 'DICT BARMM PAGALUNGAN RIVERINE POST 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-PGL-02', '50:D2:F5:88:00:57', '10.144.96.87', 'Gateway', 'Online'),
('dev-site-op-088-gw', 'site-op-088', 'DICT BARMM SHARIFF AGUAK EMERGENCY CENTER 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-SHA-02', '50:D2:F5:88:00:58', '10.144.97.88', 'Gateway', 'Online'),
('dev-site-op-089-gw', 'site-op-089', 'DICT BARMM JOLO ISLAND CIVIC TERMINAL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-JLO-02', '50:D2:F5:88:00:59', '10.144.98.89', 'Gateway', 'Online'),
('dev-site-op-090-gw', 'site-op-090', 'DICT BARMM BONGAO SEAFRONT WARD 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-BGO-02', '50:D2:F5:88:00:5a', '10.144.99.90', 'Gateway', 'Online'),
('dev-site-op-091-gw', 'site-op-091', 'DICT BASILAN ISABELA CITY TECH DESK 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BAS-ISA-02', '50:D2:F5:88:00:5b', '10.144.100.91', 'Gateway', 'Online'),
('dev-site-op-092-gw', 'site-op-092', 'DICT BASILAN LAMITAN CITY CIVIC HALL 2 - Gateway', 'RG-EG210G-E', 'RG-GW-BAS-LAM-02', '50:D2:F5:88:00:5c', '10.144.101.92', 'Gateway', 'Online'),
('dev-site-op-093-gw', 'site-op-093', 'DICT MISAMIS OCCIDENTAL OZAMIZ CITY PORT FACILITY 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-OZA-03', '50:D2:F5:88:00:5d', '10.144.102.93', 'Gateway', 'Online'),
('dev-site-op-094-gw', 'site-op-094', 'DICT MISAMIS OCCIDENTAL TANGUB CITY GOV CENTER 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-TNG-03', '50:D2:F5:88:00:5e', '10.144.103.94', 'Gateway', 'Online'),
('dev-site-op-095-gw', 'site-op-095', 'DICT MISAMIS OCCIDENTAL CLARIN MUNICIPAL LIBRARY 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-CLR-03', '50:D2:F5:88:00:5f', '10.144.104.95', 'Gateway', 'Online'),
('dev-site-op-096-gw', 'site-op-096', 'DICT MISAMIS OCCIDENTAL BONIFACIO COMM CENTER 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-BON-03', '50:D2:F5:88:00:60', '10.144.105.96', 'Gateway', 'Online'),
('dev-site-op-097-gw', 'site-op-097', 'DICT MISAMIS OCCIDENTAL SINACABAN RHU FACILITY 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-SNC-03', '50:D2:F5:88:00:61', '10.144.106.97', 'Gateway', 'Online'),
('dev-site-op-098-gw', 'site-op-098', 'DICT MISAMIS OCCIDENTAL LOPEZ JAENA DISPATCH 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-LPJ-03', '50:D2:F5:88:00:62', '10.144.107.98', 'Gateway', 'Online'),
('dev-site-op-099-gw', 'site-op-099', 'DICT MISAMIS OCCIDENTAL BALIANGAO TECH HUB 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-BLG-03', '50:D2:F5:88:00:63', '10.144.108.99', 'Gateway', 'Online'),
('dev-site-op-100-gw', 'site-op-100', 'DICT MISAMIS OCCIDENTAL SAPANG DALAGA HEALTH POST 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-SPD-03', '50:D2:F5:88:00:64', '10.144.109.100', 'Gateway', 'Online'),
('dev-site-op-101-gw', 'site-op-101', 'DICT LANAO DEL NORTE ILIGAN CITY DISASTER OFFICE 3 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-ILG-03', '50:D2:F5:88:00:65', '10.144.110.101', 'Gateway', 'Online'),
('dev-site-op-102-gw', 'site-op-102', 'DICT LANAO DEL NORTE KAUSWAGAN PEACE COMPLEX 3 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-KSW-03', '50:D2:F5:88:00:66', '10.144.111.102', 'Gateway', 'Online'),
('dev-site-op-103-gw', 'site-op-103', 'DICT LANAO DEL NORTE BACOLOD MUNICIPAL HALL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-BCD-03', '50:D2:F5:88:00:67', '10.144.112.103', 'Gateway', 'Online'),
('dev-site-op-104-gw', 'site-op-104', 'DICT LANAO DEL NORTE MAIGO CIVIC CENTER 3 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-MGO-03', '50:D2:F5:88:00:68', '10.144.113.104', 'Gateway', 'Online'),
('dev-site-op-105-gw', 'site-op-105', 'DICT LANAO DEL NORTE KOLAMBUGAN HARBOR GATE 3 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-KLM-03', '50:D2:F5:88:00:69', '10.144.114.105', 'Gateway', 'Online'),
('dev-site-op-106-gw', 'site-op-106', 'DICT LANAO DEL NORTE LALA RURAL HEALTH UNIT 3 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-LLA-03', '50:D2:F5:88:00:6a', '10.144.115.106', 'Gateway', 'Online'),
('dev-site-op-107-gw', 'site-op-107', 'DICT LANAO DEL NORTE SALVADOR TRAINING CENTER 3 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-SLV-03', '50:D2:F5:88:00:6b', '10.144.116.107', 'Gateway', 'Online'),
('dev-site-op-108-gw', 'site-op-108', 'DICT LANAO DEL NORTE SULTAN NAGA DIMAPORO TERMINAL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-LDN-SND-03', '50:D2:F5:88:00:6c', '10.144.117.108', 'Gateway', 'Online'),
('dev-site-op-109-gw', 'site-op-109', 'DICT BUKIDNON MALAYBALAY CITY TECH WING 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-MLB-03', '50:D2:F5:88:00:6d', '10.144.118.109', 'Gateway', 'Online'),
('dev-site-op-110-gw', 'site-op-110', 'DICT BUKIDNON VALENCIA CITY PUBLIC MARKET 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-VAL-03', '50:D2:F5:88:00:6e', '10.144.119.110', 'Gateway', 'Online'),
('dev-site-op-111-gw', 'site-op-111', 'DICT BUKIDNON MARAMAG AGRI EXCHANGE 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-MRM-03', '50:D2:F5:88:00:6f', '10.144.120.111', 'Gateway', 'Online'),
('dev-site-op-112-gw', 'site-op-112', 'DICT BUKIDNON QUEZON MUNICIPAL HALL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-QZN-03', '50:D2:F5:88:00:70', '10.144.121.112', 'Gateway', 'Online'),
('dev-site-op-113-gw', 'site-op-113', 'DICT BUKIDNON DON CARLOS EMERGENCY CLINIC 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-DCL-03', '50:D2:F5:88:00:71', '10.144.122.113', 'Gateway', 'Online'),
('dev-site-op-114-gw', 'site-op-114', 'DICT BUKIDNON PANGANTUCAN SEED FACILITY 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-PNG-03', '50:D2:F5:88:00:72', '10.144.123.114', 'Gateway', 'Online'),
('dev-site-op-115-gw', 'site-op-115', 'DICT BUKIDNON TALAKAG MOUNTAIN RELAY 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-TLK-03', '50:D2:F5:88:00:73', '10.144.124.115', 'Gateway', 'Online'),
('dev-site-op-116-gw', 'site-op-116', 'DICT BUKIDNON BAUNGON WATERSHED POST 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BUK-BNG-03', '50:D2:F5:88:00:74', '10.144.125.116', 'Gateway', 'Online'),
('dev-site-op-117-gw', 'site-op-117', 'DICT MISAMIS ORIENTAL CAGAYAN DE ORO CITY HALL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-CDO-03', '50:D2:F5:88:00:75', '10.144.126.117', 'Gateway', 'Online'),
('dev-site-op-118-gw', 'site-op-118', 'DICT MISAMIS ORIENTAL GINGOOG CITY SEAPORT WARD 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-GNG-03', '50:D2:F5:88:00:76', '10.144.127.118', 'Gateway', 'Online'),
('dev-site-op-119-gw', 'site-op-119', 'DICT MISAMIS ORIENTAL EL SALVADOR INNOVATION PARK 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-ELS-03', '50:D2:F5:88:00:77', '10.144.128.119', 'Gateway', 'Online'),
('dev-site-op-120-gw', 'site-op-120', 'DICT MISAMIS ORIENTAL OPOL EVACUATION COMPLEX 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-OPL-03', '50:D2:F5:88:00:78', '10.144.129.120', 'Gateway', 'Online'),
('dev-site-op-121-gw', 'site-op-121', 'DICT MISAMIS ORIENTAL TAGOLOAN INDUSTRIAL TERMINAL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-TGL-03', '50:D2:F5:88:00:79', '10.144.10.121', 'Gateway', 'Online'),
('dev-site-op-122-gw', 'site-op-122', 'DICT MISAMIS ORIENTAL VILLANUEVA POWER RELAY 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-VLN-03', '50:D2:F5:88:00:7a', '10.144.11.122', 'Gateway', 'Online'),
('dev-site-op-123-gw', 'site-op-123', 'DICT MISAMIS ORIENTAL JASAAN SKILLS INSTITUTE 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-JSN-03', '50:D2:F5:88:00:7b', '10.144.12.123', 'Gateway', 'Online'),
('dev-site-op-124-gw', 'site-op-124', 'DICT MISAMIS ORIENTAL BALINGASAG FISH PORT 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-BLS-03', '50:D2:F5:88:00:7c', '10.144.13.124', 'Gateway', 'Online'),
('dev-site-op-125-gw', 'site-op-125', 'DICT MISAMIS ORIENTAL INITAO MUNICIPAL HALL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-INT-03', '50:D2:F5:88:00:7d', '10.144.14.125', 'Gateway', 'Online'),
('dev-site-op-126-gw', 'site-op-126', 'DICT MISAMIS ORIENTAL LUGAIT REVENUE TERMINAL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-MOR-LGT-03', '50:D2:F5:88:00:7e', '10.144.15.126', 'Gateway', 'Online'),
('dev-site-op-127-gw', 'site-op-127', 'DICT BARMM COTABATO CITY REGIONAL HQ 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-COT-03', '50:D2:F5:88:00:7f', '10.144.16.127', 'Gateway', 'Online'),
('dev-site-op-128-gw', 'site-op-128', 'DICT BARMM PARANG HARBOR DEPOT 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-PRG-03', '50:D2:F5:88:00:80', '10.144.17.128', 'Gateway', 'Online'),
('dev-site-op-129-gw', 'site-op-129', 'DICT BARMM UPI COMMUNITY RADIO POST 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-UPI-03', '50:D2:F5:88:00:81', '10.144.18.129', 'Gateway', 'Online'),
('dev-site-op-130-gw', 'site-op-130', 'DICT BARMM SULTAN KUDARAT ADMIN WING 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-SKD-03', '50:D2:F5:88:00:82', '10.144.19.130', 'Gateway', 'Online'),
('dev-site-op-131-gw', 'site-op-131', 'DICT BARMM DATU ODIN SINSUAT HALL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-DOS-03', '50:D2:F5:88:00:83', '10.144.20.131', 'Gateway', 'Online'),
('dev-site-op-132-gw', 'site-op-132', 'DICT BARMM BULUAN PROVINCIAL CAPITOL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-BLN-03', '50:D2:F5:88:00:84', '10.144.21.132', 'Gateway', 'Online'),
('dev-site-op-133-gw', 'site-op-133', 'DICT BARMM PAGALUNGAN RIVERINE POST 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-PGL-03', '50:D2:F5:88:00:85', '10.144.22.133', 'Gateway', 'Online'),
('dev-site-op-134-gw', 'site-op-134', 'DICT BARMM SHARIFF AGUAK EMERGENCY CENTER 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-SHA-03', '50:D2:F5:88:00:86', '10.144.23.134', 'Gateway', 'Online'),
('dev-site-op-135-gw', 'site-op-135', 'DICT BARMM JOLO ISLAND CIVIC TERMINAL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-JLO-03', '50:D2:F5:88:00:87', '10.144.24.135', 'Gateway', 'Online'),
('dev-site-op-136-gw', 'site-op-136', 'DICT BARMM BONGAO SEAFRONT WARD 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BARMM-BGO-03', '50:D2:F5:88:00:88', '10.144.25.136', 'Gateway', 'Online'),
('dev-site-op-137-gw', 'site-op-137', 'DICT BASILAN ISABELA CITY TECH DESK 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BAS-ISA-03', '50:D2:F5:88:00:89', '10.144.26.137', 'Gateway', 'Online'),
('dev-site-op-138-gw', 'site-op-138', 'DICT BASILAN LAMITAN CITY CIVIC HALL 3 - Gateway', 'RG-EG210G-E', 'RG-GW-BAS-LAM-03', '50:D2:F5:88:00:8a', '10.144.27.138', 'Gateway', 'Online'),
('dev-site-op-139-gw', 'site-op-139', 'DICT MISAMIS OCCIDENTAL OZAMIZ CITY PORT FACILITY 4 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-OZA-04', '50:D2:F5:88:00:8b', '10.144.28.139', 'Gateway', 'Online'),
('dev-site-op-140-gw', 'site-op-140', 'DICT MISAMIS OCCIDENTAL TANGUB CITY GOV CENTER 4 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-TNG-04', '50:D2:F5:88:00:8c', '10.144.29.140', 'Gateway', 'Online'),
('dev-site-op-141-gw', 'site-op-141', 'DICT MISAMIS OCCIDENTAL CLARIN MUNICIPAL LIBRARY 4 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-CLR-04', '50:D2:F5:88:00:8d', '10.144.30.141', 'Gateway', 'Online'),
('dev-site-op-142-gw', 'site-op-142', 'DICT MISAMIS OCCIDENTAL BONIFACIO COMM CENTER 4 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-BON-04', '50:D2:F5:88:00:8e', '10.144.31.142', 'Gateway', 'Online'),
('dev-site-op-143-gw', 'site-op-143', 'DICT MISAMIS OCCIDENTAL SINACABAN RHU FACILITY 4 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-SNC-04', '50:D2:F5:88:00:8f', '10.144.32.143', 'Gateway', 'Online'),
('dev-site-op-144-gw', 'site-op-144', 'DICT MISAMIS OCCIDENTAL LOPEZ JAENA DISPATCH 4 - Gateway', 'RG-EG210G-E', 'RG-GW-MO-LPJ-04', '50:D2:F5:88:00:90', '10.144.33.144', 'Gateway', 'Online')
ON DUPLICATE KEY UPDATE `device_name`=VALUES(`device_name`);

-- 6. System Settings
INSERT INTO `system_settings` (`config_key`, `config_value`, `category`) VALUES
('account.email', 'emontero@dict.gov.ph', 'account'),
('account.fullName', 'Engr. Engel Montero', 'account'),
('account.role', 'Lead Network Operations Supervisor', 'account'),
('general.language', 'en', 'general'),
('general.systemTitle', 'Multifactors Sales Network Monitoring System', 'general'),
('general.timezone', 'Asia/Manila', 'general'),
('monitoring.autoDowntimeThresholdSeconds', '30', 'monitoring'),
('monitoring.syncIntervalSeconds', '15', 'monitoring'),
('monitoring.targetUptimeSla', '99.8', 'monitoring'),
('ruijie.appId', 'YOUR_RUIJIE_APP_ID_HERE', 'ruijie'),
('ruijie.appSecret', 'YOUR_RUIJIE_APP_SECRET_HERE', 'ruijie'),
('ruijie.baseUrl', 'https://cloud.ruijienetworks.com', 'ruijie'),
('ruijie.tenantId', 'dict-reg10-noc', 'ruijie'),
('telegram.autoDispatchOnDowntime', 'true', 'telegram'),
('telegram.botToken', 'YOUR_TELEGRAM_BOT_TOKEN_HERE', 'telegram'),
('telegram.defaultChannelId', '-1001234567890', 'telegram'),
('telegram.template', '🚨 *DICT NOC INCIDENT DISPATCH*
📍 *Site:* {{siteName}}
🏷 *Code:* {{siteCode}}
⚠️ *Severity:* {{severity}}
⏱ *Duration:* {{duration}}
👤 *Assigned:* @{{telegramUsername}}', 'telegram')
ON DUPLICATE KEY UPDATE `config_value`=VALUES(`config_value`);

-- 7. Activity Logs
INSERT INTO `activity_logs` (`id`, `type`, `title`, `description`, `site_name`, `site_code`, `person_name`, `telegram_username`, `severity`, `created_at`) VALUES
('act-01', 'outage', 'Site Downtime Alarm Triggered', 'Critical outage detected: All 4 devices offline at DICT MIS OCC OROQUIETA CITY HALL I.', 'DICT MIS OCC OROQUIETA CITY HALL I', 'MO-ORQ-01', 'Engr. Juan Dela Cruz', 'jdelacruz_dict', 'critical', NOW() - INTERVAL 10 MINUTE),
('act-02', 'telegram', 'Telegram Outage Alert Dispatched', 'Incident notification ticket successfully dispatched to @jdelacruz_dict via Telegram Bot API.', 'DICT MIS OCC OROQUIETA CITY HALL I', 'MO-ORQ-01', 'Engr. Juan Dela Cruz', 'jdelacruz_dict', 'info', NOW() - INTERVAL 10 MINUTE),
('act-03', 'assignment', 'Area Personnel Assignment Confirmed', 'Althea Ramos assigned to Misamis Occidental Area triage roster.', 'DICT MIS OCC ALORAN MUNICIPAL HALL', 'MO-ALR-01', 'Althea Ramos', 'aramos_noc', 'info', NOW() - INTERVAL 10 MINUTE),
('act-04', 'recovery', 'Device Telemetry Restored', 'Access Point AP-03 in CDO Regional Office returned to Online state (Heartbeat 24ms).', 'DICT REGION 10 NOC CAGAYAN DE ORO REGIONAL OFFICE', 'CDO-NOC-01', 'Engr. Engel Montero', 'emontero_dict', 'success', NOW() - INTERVAL 10 MINUTE),
('act-1788842760628', 'system', 'Console Operator Login', 'User Engr. Engel Montero (emontero) authenticated to Multifactors Sales Monitoring System.', NULL, NULL, NULL, NULL, 'info', NOW() - INTERVAL 10 MINUTE),
('act-1788842795245', 'system', 'Console Operator Login', 'User Engr. Engel Montero (emontero) authenticated to Multifactors Sales Monitoring System.', NULL, NULL, NULL, NULL, 'info', NOW() - INTERVAL 10 MINUTE),
('act-1788842880997', 'system', 'Console Operator Login', 'User Engr. Engel Montero (emontero) authenticated to Multifactors Sales Monitoring System.', NULL, NULL, NULL, NULL, 'info', NOW() - INTERVAL 10 MINUTE)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- 8. Telegram Dispatches
INSERT INTO `telegram_dispatches` (`id`, `event_id`, `site_id`, `recipient_name`, `telegram_username`, `message_body`, `status`, `sent_at`) VALUES
('disp-site-01', 'evt-site-01', 'site-01', 'Engr. Juan Dela Cruz', 'jdelacruz_dict', '🚨 Alert dispatched for DICT MIS OCC OROQUIETA CITY HALL I', 'Delivered', NOW() - INTERVAL 5 MINUTE),
('disp-site-04', 'evt-site-04', 'site-04', 'Catherine Villanueva', 'cvillanueva_noc', '🚨 Alert dispatched for DICT LANAO DEL NORTE BALOI POBLACION', 'Delivered', NOW() - INTERVAL 5 MINUTE),
('disp-site-06', 'evt-site-06', 'site-06', 'Roderick Tan', 'rtan_camiguin', '🚨 Alert dispatched for DICT BUKIDNON MALITBOG MUNICIPAL BLDG', 'Delivered', NOW() - INTERVAL 5 MINUTE),
('disp-site-08', 'evt-site-08', 'site-08', 'Abdul Rashid Macapaar', 'armacapaar_barmm', '🚨 Alert dispatched for DICT LANAO DEL SUR MARAWI CITY CAPITOL', 'Delivered', NOW() - INTERVAL 5 MINUTE)
ON DUPLICATE KEY UPDATE `recipient_name`=VALUES(`recipient_name`);

