import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const events = await db.events.getActive();
    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      isLiveDb: await db.isLive(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed fetching downtime events.' },
      { status: 500 }
    );
  }
}
