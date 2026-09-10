const fs = require('fs');
const mysql = require('mysql2/promise');

async function exportSql() {
  const pool = mysql.createPool({ uri: 'mysql://root:@localhost:3306/monitoring_system' });

  // Read DDL part of schema.sql up to '-- INITIAL SEED DATA'
  const original = fs.readFileSync('schema.sql', 'utf8');
  const ddlPart = original.split('-- INITIAL SEED DATA')[0];

  let sql = ddlPart + '-- INITIAL SEED DATA (DICT REGION 10 & MULTIFACTORS INTEGRATION)\n-- ==============================================================================\n\n';

  // 1. users
  const [users] = await pool.query('SELECT * FROM users');
  sql += '-- 1. Initial Users\nINSERT INTO `users` (`id`, `full_name`, `email`, `username`, `password_hash`, `role`, `status`, `two_factor_enabled`) VALUES\n';
  sql += users.map(u => `('${u.id}', '${u.full_name.replace(/'/g, "\\'")}', '${u.email}', '${u.username}', '${u.password_hash}', '${u.role}', '${u.status}', ${u.two_factor_enabled})`).join(',\n') + '\nON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);\n\n';

  // 2. area_assignments
  const [areas] = await pool.query('SELECT * FROM area_assignments');
  sql += '-- 2. Initial Area Assignments\nINSERT INTO `area_assignments` (`id`, `area_name`, `person_name`, `phone`, `telegram_username`, `role`, `status`) VALUES\n';
  sql += areas.map(a => `('${a.id}', '${a.area_name.replace(/'/g, "\\'")}', '${a.person_name.replace(/'/g, "\\'")}', '${a.phone}', '${a.telegram_username}', '${a.role}', '${a.status}')`).join(',\n') + '\nON DUPLICATE KEY UPDATE `area_name`=VALUES(`area_name`);\n\n';

  // 3. sites (all 152)
  const [sites] = await pool.query('SELECT * FROM sites ORDER BY status = "Downtime" DESC, id ASC');
  sql += '-- 3. Monitored Sites (All 152 Regional Facilities in Northern Mindanao & BARMM)\nINSERT INTO `sites` (`id`, `name`, `code`, `region`, `province`, `status`, `device_count`, `offline_count`, `online_count`, `active_alarm_count`, `alarm_type`, `severity`, `downtime_started_at`, `last_known_ip`, `latitude`, `longitude`, `assigned_handler_id`) VALUES\n';
  sql += sites.map(s => {
    const alarmType = s.alarm_type ? `'${s.alarm_type}'` : 'NULL';
    const severity = s.severity ? `'${s.severity}'` : 'NULL';
    const dtStarted = s.downtime_started_at ? 'NOW() - INTERVAL 1 HOUR' : 'NULL';
    const handler = s.assigned_handler_id ? `'${s.assigned_handler_id}'` : 'NULL';
    return `('${s.id}', '${s.name.replace(/'/g, "\\'")}', '${s.code}', '${s.region}', '${s.province}', '${s.status}', ${s.device_count}, ${s.offline_count}, ${s.online_count}, ${s.active_alarm_count}, ${alarmType}, ${severity}, ${dtStarted}, '${s.last_known_ip}', ${s.latitude}, ${s.longitude}, ${handler})`;
  }).join(',\n') + '\nON DUPLICATE KEY UPDATE `name`=VALUES(`name`);\n\n';

  // 4. downtime_events (All 8)
  const [events] = await pool.query('SELECT * FROM downtime_events');
  sql += '-- 4. Downtime Incidents & Alarms (Active Regional Outages)\nINSERT INTO `downtime_events` (`id`, `site_id`, `alarm_type`, `severity`, `status`, `generated_at`, `duration_seconds`, `affected_device_count`, `offline_device_count`, `last_known_ip`, `assigned_handler_id`) VALUES\n';
  sql += events.map(e => {
    const handler = e.assigned_handler_id ? `'${e.assigned_handler_id}'` : 'NULL';
    return `('${e.id}', '${e.site_id}', '${e.alarm_type}', '${e.severity}', '${e.status}', NOW() - INTERVAL ${e.duration_seconds} SECOND, ${e.duration_seconds}, ${e.affected_device_count}, ${e.offline_device_count}, '${e.last_known_ip}', ${handler})`;
  }).join(',\n') + '\nON DUPLICATE KEY UPDATE `alarm_type`=VALUES(`alarm_type`);\n\n';

  // 5. devices
  const [devices] = await pool.query('SELECT * FROM devices');
  sql += '-- 5. Hardware Equipment (Gateways, Switches & Reyee APs)\nINSERT INTO `devices` (`id`, `site_id`, `device_name`, `model`, `serial_number`, `mac_address`, `ip_address`, `device_type`, `status`) VALUES\n';
  sql += devices.map(d => `('${d.id}', '${d.site_id}', '${d.device_name.replace(/'/g, "\\'")}', '${d.model}', '${d.serial_number}', '${d.mac_address}', '${d.ip_address}', '${d.device_type}', '${d.status}')`).join(',\n') + '\nON DUPLICATE KEY UPDATE `device_name`=VALUES(`device_name`);\n\n';

  // 6. system_settings
  const [settings] = await pool.query('SELECT * FROM system_settings');
  sql += '-- 6. System Settings\nINSERT INTO `system_settings` (`config_key`, `config_value`, `category`) VALUES\n';
  sql += settings.map(st => `('${st.config_key}', '${st.config_value.replace(/'/g, "\\'")}', '${st.category}')`).join(',\n') + '\nON DUPLICATE KEY UPDATE `config_value`=VALUES(`config_value`);\n\n';

  // 7. activity_logs
  const [logs] = await pool.query('SELECT * FROM activity_logs');
  sql += '-- 7. Activity Logs\nINSERT INTO `activity_logs` (`id`, `type`, `title`, `description`, `site_name`, `site_code`, `person_name`, `telegram_username`, `severity`, `created_at`) VALUES\n';
  sql += logs.map(l => {
    const siteName = l.site_name ? `'${l.site_name.replace(/'/g, "\\'")}'` : 'NULL';
    const siteCode = l.site_code ? `'${l.site_code}'` : 'NULL';
    const person = l.person_name ? `'${l.person_name.replace(/'/g, "\\'")}'` : 'NULL';
    const tg = l.telegram_username ? `'${l.telegram_username}'` : 'NULL';
    return `('${l.id}', '${l.type}', '${l.title.replace(/'/g, "\\'")}', '${l.description.replace(/'/g, "\\'")}', ${siteName}, ${siteCode}, ${person}, ${tg}, '${l.severity}', NOW() - INTERVAL 10 MINUTE)`;
  }).join(',\n') + '\nON DUPLICATE KEY UPDATE `title`=VALUES(`title`);\n\n';

  // 8. telegram_dispatches
  const [dispatches] = await pool.query('SELECT * FROM telegram_dispatches');
  if (dispatches.length > 0) {
    sql += '-- 8. Telegram Dispatches\nINSERT INTO `telegram_dispatches` (`id`, `event_id`, `site_id`, `recipient_name`, `telegram_username`, `message_body`, `status`, `sent_at`) VALUES\n';
    sql += dispatches.map(dp => `('${dp.id}', '${dp.event_id}', '${dp.site_id}', '${dp.recipient_name}', '${dp.telegram_username}', '${dp.message_body.replace(/'/g, "\\'")}', '${dp.status}', NOW() - INTERVAL 5 MINUTE)`).join(',\n') + '\nON DUPLICATE KEY UPDATE `recipient_name`=VALUES(`recipient_name`);\n\n';
  }

  fs.writeFileSync('schema.sql', sql, 'utf8');
  console.log('Successfully updated schema.sql with complete 152 sites, downtime_events, devices, and settings!');
  await pool.end();
}

exportSql().catch(e => console.error('Export error:', e));
