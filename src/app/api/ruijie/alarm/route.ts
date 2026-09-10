import { NextRequest, NextResponse } from 'next/server';
import { recordSiteOutage, recordSiteRecovery } from '@/lib/services/ruijieService';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * POST /api/ruijie/alarm
 * Realtime receiver for Ruijie Cloud Alarm Push, Outages, and Device Offline Webhooks
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || body.status || 'down';

    // Handle site recovery
    if (action === 'recovery' || action === 'online' || action === 'up' || body.status === 'online') {
      const siteIdentifier = body.siteId || body.siteName || body.siteCode || body.targetSiteId;
      if (!siteIdentifier) {
        return NextResponse.json(
          { success: false, message: 'siteId, siteName, or siteCode is required.' },
          { status: 400, headers: noCacheHeaders }
        );
      }
      const result = await recordSiteRecovery(siteIdentifier);
      return NextResponse.json(result, { headers: noCacheHeaders });
    }

    // Handle site downtime / all offline
    const outageResult = await recordSiteOutage({
      siteId: body.siteId || body.targetSiteId,
      siteName: body.siteName || body.projectName || body.group_name || body.name,
      siteCode: body.siteCode || body.code,
      alarmType: body.alarmType || body.alarm_type || 'All device offline',
      severity: body.severity || 'Critical',
      offlineCount: body.offlineCount !== undefined ? Number(body.offlineCount) : undefined,
      totalDevices: body.deviceCount !== undefined ? Number(body.deviceCount) : body.totalDevices !== undefined ? Number(body.totalDevices) : undefined,
      lastKnownIp: body.lastKnownIp || body.ip || body.dev_ip,
    });

    return NextResponse.json(outageResult, { headers: noCacheHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed recording Ruijie outage alarm.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

/**
 * GET /api/ruijie/alarm
 * Check active Ruijie outages in realtime
 */
export async function GET() {
  try {
    const pool = await getDbPool();
    if (!pool) {
      return NextResponse.json({ success: false, message: 'Database disconnected' }, { status: 500 });
    }

    const [rows]: any = await pool.query(
      "SELECT * FROM sites WHERE status = 'Downtime' OR offline_count > 0 ORDER BY offline_count DESC"
    );

    return NextResponse.json(
      {
        success: true,
        activeOutagesCount: Array.isArray(rows) ? rows.length : 0,
        outages: rows || [],
      },
      { headers: noCacheHeaders }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
