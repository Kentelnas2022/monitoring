import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncRuijieCloudTelemetry } from '@/lib/services/ruijieService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let lastRuijieSyncTime = 0;
let isSyncingInBackground = false;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shouldSync = searchParams.get('sync') === 'true';

    if (shouldSync) {
      try {
        await syncRuijieCloudTelemetry();
        lastRuijieSyncTime = Date.now();
      } catch (syncErr) {
        console.warn('[API /api/sites] Background sync note:', syncErr);
      }
    }

    let sites = await db.sites.getAll();

    // If table is empty, auto-sync immediately so user never sees 0 projects
    if (!sites || sites.length === 0) {
      try {
        console.log('[API /api/sites] No sites found in DB. Auto-syncing Ruijie Cloud telemetry in realtime...');
        await syncRuijieCloudTelemetry();
        lastRuijieSyncTime = Date.now();
        sites = await db.sites.getAll();
      } catch (autoSyncErr) {
        console.warn('[API /api/sites] Realtime auto-sync error:', autoSyncErr);
      }
    } else {
      // Realtime periodic background refresh (every 5s) so data stays freshly synchronized without blocking the response
      const now = Date.now();
      if (!isSyncingInBackground && now - lastRuijieSyncTime > 5000) {
        isSyncingInBackground = true;
        syncRuijieCloudTelemetry()
          .then(() => {
            lastRuijieSyncTime = Date.now();
          })
          .catch((err) => {
            console.warn('[API /api/sites] Background realtime sync error:', err);
          })
          .finally(() => {
            isSyncingInBackground = false;
          });
      }
    }

    // Compute live dashboard stats dynamically from database
    const totalProjects = sites.length;
    const connectedDevices = sites.reduce((acc, s) => acc + s.deviceCount, 0);
    const devicesOffline = sites.reduce((acc, s) => acc + s.offlineCount, 0);
    const devicesOnline = sites.reduce((acc, s) => acc + s.onlineCount, 0);
    const activeAlarms = sites.reduce((acc, s) => acc + s.activeAlarmCount, 0);
    const criticalAlarms = sites.filter((s) => s.severity === 'Critical').length;
    const moderateAlarms = sites.filter((s) => s.severity === 'Moderate').length;
    const projectsActive = sites.filter((s) => s.status === 'Operational').length;
    const projectsUnderMaintenance = sites.filter((s) => s.status === 'Maintenance').length;

    // Granular AP / Gateway / Switch health totals
    const totalAps = sites.reduce((acc, s) => acc + (s.apCount || 0), 0);
    const offlineAps = sites.reduce((acc, s) => acc + (s.apOffline || 0), 0);
    const onlineAps = Math.max(0, totalAps - offlineAps);

    const totalGateways = sites.reduce((acc, s) => acc + (s.gatewayCount || 0), 0);
    const offlineGateways = sites.reduce((acc, s) => acc + (s.gatewayOffline || 0), 0);
    const onlineGateways = Math.max(0, totalGateways - offlineGateways);

    const totalSwitches = sites.reduce((acc, s) => acc + (s.switchCount || 0), 0);
    const offlineSwitches = sites.reduce((acc, s) => acc + (s.switchOffline || 0), 0);
    const onlineSwitches = Math.max(0, totalSwitches - offlineSwitches);

    return NextResponse.json(
      {
        success: true,
        sites,
        stats: {
          totalProjects,
          connectedDevices,
          activeAlarms,
          projectsActive,
          projectsUnderMaintenance,
          devicesOnline,
          devicesOffline,
          criticalAlarms,
          moderateAlarms,
          totalAps,
          onlineAps,
          offlineAps,
          totalGateways,
          onlineGateways,
          offlineGateways,
          totalSwitches,
          onlineSwitches,
          offlineSwitches,
        },
        isLiveDb: await db.isLive(),
        syncedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed fetching sites.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { siteName, assignedHandler } = body;

    if (!siteName || !assignedHandler) {
      return NextResponse.json(
        { success: false, message: 'siteName and assignedHandler are required.' },
        { status: 400 }
      );
    }

    await db.sites.updateHandler(siteName, assignedHandler);

    return NextResponse.json({
      success: true,
      message: `Site ${siteName} responder updated successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed updating site.' },
      { status: 500 }
    );
  }
}

export const PUT = POST;
