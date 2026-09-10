import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callTelegramApi } from '@/lib/services/telegramService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId')?.trim();

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: 'Telegram Account ID (chatId) is required' },
        { status: 400 }
      );
    }

    let token = process.env.TELEGRAM_BOT_TOKEN || '8738860219:AAGHT3ZdCFMzakSVSZCsvMN03P1TMpy2_Jg';
    try {
      const s = await db.settings.get();
      if (
        s?.telegram?.botToken &&
        s.telegram.botToken !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE' &&
        !s.telegram.botToken.includes('1234567890') &&
        s.telegram.botToken.trim() !== ''
      ) {
        token = s.telegram.botToken;
      }
    } catch {}

    const data = await callTelegramApi(
      `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`,
      null,
      'GET'
    );

    if (!data.ok) {
      let friendlyMessage = data.description || 'Telegram account not found.';
      if (data.description && data.description.toLowerCase().includes('chat not found')) {
        friendlyMessage = `Telegram account #${chatId} has not started @multifactors_bot yet. Please open Telegram, search for @multifactors_bot (or https://t.me/multifactors_bot), and tap "START" once to activate.`;
      }
      return NextResponse.json({
        success: false,
        message: friendlyMessage,
        rawDescription: data.description,
      });
    }

    const chat = data.result;
    const fullName = [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || 'Telegram User';

    return NextResponse.json({
      success: true,
      account: {
        id: String(chat.id),
        name: fullName,
        username: chat.username || '',
        firstName: chat.first_name || '',
        lastName: chat.last_name || '',
        type: chat.type || 'private',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Telegram lookup failed.' },
      { status: 500 }
    );
  }
}
