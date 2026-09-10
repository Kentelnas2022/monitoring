import { NextResponse } from 'next/server';
import { syncRuijieCloudTelemetry } from '@/lib/services/ruijieService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// POST /api/ruijie/sync — manually triggered from dashboard Refresh button
export async function POST() {
  try {
    const result = await syncRuijieCloudTelemetry();
    return NextResponse.json(result, { headers: noCacheHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Ruijie Cloud telemetry sync error.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

// GET /api/ruijie/sync — same, for easy browser testing
export async function GET() {
  try {
    const result = await syncRuijieCloudTelemetry();
    return NextResponse.json(result, { headers: noCacheHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Ruijie Cloud telemetry sync error.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
