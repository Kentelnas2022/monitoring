import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = await getDbPool();
    if (!pool) {
      return NextResponse.json({ success: false, message: 'Database not connected' }, { status: 500 });
    }

    const [rows]: any = await pool.query(
      "SELECT id, name, code, province, status, offline_count, alarm_type, severity, last_known_ip, latitude, longitude FROM sites WHERE status = 'Downtime' OR offline_count > 0"
    );

    return NextResponse.json({
      success: true,
      hasOutage: Array.isArray(rows) && rows.length > 0,
      outages: rows || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const pool = await getDbPool();
    if (!pool) {
      return NextResponse.json({ success: false, message: 'Database not connected' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'trigger';
    const targetSiteId = body.siteId || 'site-rcv-027'; // DICT_PICS_NUNUNGAN (Lanao del Norte)

    if (action === 'trigger') {
      const [siteRows]: any = await pool.query('SELECT * FROM sites WHERE id = ?', [targetSiteId]);
      if (!siteRows || siteRows.length === 0) {
        return NextResponse.json({ success: false, message: `Site ${targetSiteId} not found` }, { status: 404 });
      }
      const site = siteRows[0];

      await pool.query(
        `UPDATE sites 
         SET status = 'Downtime',
             offline_count = 1,
             online_count = 0,
             active_alarm_count = 1,
             alarm_type = 'Device Offline Alarm',
             severity = 'Critical',
             downtime_started_at = NOW()
         WHERE id = ?`,
        [targetSiteId]
      );

      await pool.query(
        "UPDATE devices SET status = 'Offline' WHERE site_id = ?",
        [targetSiteId]
      );

      const eventId = `evt-${targetSiteId}`;
      await pool.query(
        `INSERT INTO downtime_events 
           (id, site_id, alarm_type, severity, status, generated_at, duration_seconds, affected_device_count, offline_device_count, last_known_ip, assigned_handler_id)
         VALUES (?, ?, 'Device Offline Alarm', 'Critical', 'Active', NOW(), 60, 1, 1, ?, ?)
         ON DUPLICATE KEY UPDATE status = 'Active', severity = 'Critical', generated_at = NOW(), offline_device_count = 1`,
        [eventId, targetSiteId, site.last_known_ip || '10.145.88.14', site.assigned_handler_id || 'area-ldn']
      );

      const logId = `ACT-SIM-${Date.now().toString().slice(-5)}`;
      await pool.query(
        `INSERT INTO activity_logs 
           (id, type, title, description, site_id, site_name, site_code, severity, created_at)
         VALUES (?, 'outage', '器 Outage Alarm Detected', ?, ?, ?, ?, 'critical', NOW())`,
        [
          logId,
          `Hardware offline detected at ${site.name} (${site.code}). Siren alert sounded and automatic incident dispatch activated.`,
          site.id,
          site.name,
          site.code,
        ]
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        action: 'triggered',
        message: `Test outage successfully triggered on ${site.name} (${site.code})`,
        site: {
          ...site,
          status: 'Downtime',
          offline_count: 1,
          online_count: 0,
          active_alarm_count: 1,
          alarm_type: 'Device Offline Alarm',
          severity: 'Critical',
        },
      });
    } else {
      const condition = body.siteId ? 'WHERE id = ?' : "WHERE status = 'Downtime' OR offline_count > 0";
      const params = body.siteId ? [body.siteId] : [];

      const [affectedSites]: any = await pool.query(`SELECT id, name, code FROM sites ${condition}`, params);

      await pool.query(
        `UPDATE sites 
         SET status = 'Operational',
             offline_count = 0,
             online_count = device_count,
             active_alarm_count = 0,
             alarm_type = NULL,
             severity = NULL,
             downtime_started_at = NULL
         ${condition}`,
        params
      );

      if (body.siteId) {
        await pool.query("UPDATE devices SET status = 'Online' WHERE site_id = ?", [body.siteId]);
        await pool.query("UPDATE downtime_events SET status = 'Resolved', resolved_at = NOW() WHERE site_id = ?", [body.siteId]);
      } else {
        await pool.query("UPDATE devices SET status = 'Online'");
        await pool.query("UPDATE downtime_events SET status = 'Resolved', resolved_at = NOW() WHERE status = 'Active'");
      }

      const logId = `ACT-REC-${Date.now().toString().slice(-5)}`;
      await pool.query(
        `INSERT INTO activity_logs 
           (id, type, title, description, severity, created_at)
         VALUES (?, 'recovery', '꜅ Network Connectivity Restored', 'All network nodes operational. Outage incident cleared.', 'info', NOW())`
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        action: 'resolved',
        message: 'All test outages resolved. Sites returned to Operational status.',
        resolvedCount: (affectedSites || []).length,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}