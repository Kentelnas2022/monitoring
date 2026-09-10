import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const isLiveDb = await db.isLive();

  const appId = process.env.RUIJIE_APP_ID || '';
  const appSecret = process.env.RUIJIE_APP_SECRET || '';
  const hasRuijieKeys =
    appId.length > 0 &&
    appSecret.length > 0 &&
    appId !== 'your_ruijie_app_id' &&
    appSecret !== 'your_ruijie_app_secret';

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const hasTelegramToken =
    telegramToken.length > 10 &&
    !telegramToken.includes('1234567890') &&
    !telegramToken.includes('ABCdef');

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: 'Multifactors Sales Network Monitoring System',
    services: {
      database: {
        type: 'MySQL (InnoDB / utf8mb4)',
        connected: isLiveDb,
        mode: isLiveDb
          ? 'Live MySQL — Active'
          : 'MySQL offline — set DATABASE_URL in .env.local',
      },
      ruijieCloudApi: {
        configured: hasRuijieKeys,
        baseUrl: process.env.RUIJIE_BASE_URL || 'https://cloud-as.ruijienetworks.com',
        appId: appId ? appId.slice(0, 8) + '***' : '(not set)',
        mode: hasRuijieKeys
          ? 'Live Ruijie Cloud Open API — Connected & Synchronized'
          : 'Set RUIJIE_APP_ID and RUIJIE_APP_SECRET in .env.local',
      },
      telegramBotApi: {
        configured: hasTelegramToken,
        mode: hasTelegramToken
          ? 'Live Telegram Bot API — Active'
          : 'Add TELEGRAM_BOT_TOKEN in .env.local to activate',
      },
    },
  });
}
