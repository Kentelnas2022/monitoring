import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const settings = await db.settings.get();
    return NextResponse.json({
      success: true,
      settings,
      isLiveDb: await db.isLive(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed fetching settings.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await db.settings.update(body);

    await db.logs.add({
      type: 'system',
      title: 'System Settings Saved to Database',
      description: 'System parameters, language, or account preferences updated.',
      severity: 'info',
      timestamp: 'Just now',
    });

    return NextResponse.json({
      success: true,
      settings: updated,
      message: 'System settings saved successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed updating settings.' },
      { status: 500 }
    );
  }
}
