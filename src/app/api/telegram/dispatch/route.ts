import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramIncidentAlert, testTelegramBotConnection } from '@/lib/services/telegramService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || undefined;
    const chatId = searchParams.get('chatId') || undefined;
    const result = await testTelegramBotConnection(token, chatId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Telegram test failed.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.test) {
      const result = await testTelegramBotConnection(body.token, body.chatId);
      return NextResponse.json(result);
    }

    const { siteName, recipientName, telegramUsername } = body;

    if (!siteName || !recipientName || !telegramUsername) {
      return NextResponse.json(
        { success: false, message: 'siteName, recipientName, and telegramUsername are required.' },
        { status: 400 }
      );
    }

    const result = await sendTelegramIncidentAlert(body);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Telegram dispatch error.' },
      { status: 500 }
    );
  }
}
