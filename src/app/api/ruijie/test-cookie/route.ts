import { NextRequest, NextResponse } from 'next/server';
import { testRuijieSessionCookie, syncRuijieCloudTelemetry } from '@/lib/services/ruijieService';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cookie = (body.cookie || '').trim();
    const baseUrl = body.baseUrl || 'https://cloud-as.ruijienetworks.com';
    const doSync = Boolean(body.syncNow);

    if (!cookie) {
      return NextResponse.json(
        { success: false, message: 'Please provide a Ruijie session cookie string.' },
        { status: 400 }
      );
    }

    // 1. Test cookie against Ruijie Cloud
    const testResult = await testRuijieSessionCookie(cookie, baseUrl);
    if (!testResult.success) {
      return NextResponse.json(testResult, { status: 400 });
    }

    // 2. If valid, save cookie in system settings
    await db.settings.update({
      monitoring: {
        ruijieSessionCookie: cookie,
        ruijieApiEndpoint: baseUrl,
      } as any,
    });

    // 3. If syncNow requested, immediately sync the 122+ received projects
    let syncResult = null;
    if (doSync) {
      syncResult = await syncRuijieCloudTelemetry(cookie);
    }

    return NextResponse.json({
      success: true,
      message: syncResult ? syncResult.message : testResult.message,
      totalReceived: testResult.totalReceived,
      sampleNames: testResult.sampleNames,
      syncResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Cookie verification error' },
      { status: 500 }
    );
  }
}
