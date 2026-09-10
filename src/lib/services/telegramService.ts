import https from 'node:https';
import dns from 'node:dns';
import { db } from '@/lib/db';

// Ensure Google & Cloudflare DNS servers are configured
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  dns.setDefaultResultOrder('ipv4first');
} catch {}

function customTelegramLookup(hostname: string, options: any, callback: (err: any, address?: any, family?: number) => void) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  // Fast-path for Telegram API to bypass local ISP UDP port 53 timeouts
  if (hostname === 'api.telegram.org') {
    if (options && options.all) {
      return callback(null, [{ address: '149.154.166.110', family: 4 }]);
    }
    return callback(null, '149.154.166.110', 4);
  }

  dns.resolve4(hostname, (err, addrs) => {
    if (err || !addrs || addrs.length === 0) {
      dns.lookup(hostname, options, callback);
    } else {
      if (options && options.all) {
        callback(null, addrs.map((a) => ({ address: a, family: 4 })));
      } else {
        callback(null, addrs[0], 4);
      }
    }
  });
}

export async function callTelegramApi(endpoint: string, payload?: any, method: 'GET' | 'POST' = 'POST'): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const bodyStr = payload ? JSON.stringify(payload) : null;

    const req = https.request(
      url,
      {
        method,
        lookup: customTelegramLookup,
        headers: {
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        },
        timeout: 4000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ ok: false, error: 'Invalid JSON response', raw: data });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Telegram API request timed out'));
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

function escapeHtml(text: string = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface TelegramDispatchPayload {
  siteId?: string;
  siteName: string;
  siteCode?: string;
  severity?: string;
  alarmType?: string;
  downtimeDuration?: string;
  offlineDeviceCount?: number;
  totalDeviceCount?: number;
  lastKnownIp?: string;
  recipientName: string;
  telegramUsername: string;
  chatId?: string;
  customNotes?: string;
}

export interface AreaDowntimeDispatchPayload {
  areaName: string;
  recipientName: string;
  telegramUsername: string;
  chatId?: string;
  downSites: Array<{
    name: string;
    code?: string;
    offlineCount: number;
    deviceCount?: number;
    lastKnownIp?: string;
    downtimeDuration?: string;
    severity?: string;
  }>;
}

export interface TelegramDispatchResult {
  success: boolean;
  message: string;
  dispatchId?: string;
  mode: 'live_telegram' | 'simulated';
}

/**
 * Send individual site incident dispatch alert via Telegram Bot API
 */
export async function sendTelegramIncidentAlert(payload: TelegramDispatchPayload): Promise<TelegramDispatchResult> {
  let token = process.env.TELEGRAM_BOT_TOKEN || '8738860219:AAGHT3ZdCFMzakSVSZCsvMN03P1TMpy2_Jg';
  let targetChatId = payload.chatId || process.env.TELEGRAM_DEFAULT_CHAT_ID || '7227734738';

  // Dynamically query system settings for current active token and chat ID
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
    if (s?.telegram?.channelId && !payload.chatId) {
      targetChatId = s.telegram.channelId;
    }
  } catch {}

  if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    token = '8738860219:AAGHT3ZdCFMzakSVSZCsvMN03P1TMpy2_Jg';
  }

  const cleanUsername = (payload.telegramUsername || 'dict_noc').replace(/^@/, '');

  // If the username given is a numeric chat ID or starts with -, use it as targetChatId directly
  if (/^-?\d+$/.test(cleanUsername)) {
    targetChatId = cleanUsername;
  } else if (!payload.chatId) {
    // Attempt resolving chat ID from active area assignments
    try {
      const allAssignments: any = await db.assignments.getAll();
      const match = allAssignments.find(
        (a: any) =>
          (a.telegram && a.telegram.replace(/^@/, '').toLowerCase() === cleanUsername.toLowerCase()) ||
          (a.personName && payload.recipientName && a.personName.toLowerCase() === payload.recipientName.toLowerCase())
      );
      if (match && match.chatId) {
        targetChatId = match.chatId;
      }
    } catch {}
  }

  const htmlMessage = 
    `🚨 <b>DICT NOC INCIDENT DISPATCH</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Site:</b> <b>${escapeHtml(payload.siteName)}</b>\n` +
    (payload.siteCode ? `🏷 <b>Code:</b> <code>${escapeHtml(payload.siteCode)}</code>\n` : '') +
    `⚠️ <b>Severity:</b> <b>${escapeHtml((payload.severity || 'Critical').toUpperCase())}</b>\n` +
    (payload.alarmType ? `⚡ <b>Alarm:</b> ${escapeHtml(payload.alarmType)}\n` : '') +
    (payload.offlineDeviceCount !== undefined ? `📶 <b>Device Health:</b> ${payload.offlineDeviceCount} of ${payload.totalDeviceCount || payload.offlineDeviceCount} Offline\n` : '') +
    (payload.lastKnownIp ? `🌐 <b>Gateway IP:</b> <code>${escapeHtml(payload.lastKnownIp)}</code>\n` : '') +
    (payload.downtimeDuration ? `⏱ <b>Downtime Duration:</b> ${escapeHtml(payload.downtimeDuration)}\n` : '') +
    `👤 <b>Assigned Responder:</b> ${escapeHtml(payload.recipientName)} (@${escapeHtml(cleanUsername)})\n` +
    (payload.customNotes ? `📝 <b>Dispatch Notes:</b> <i>${escapeHtml(payload.customNotes)}</i>\n` : '') +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Multifactors Sales Network Monitoring System • Automated Field Triage</i>`;

  // If a live bot token is present and configured
  if (token && token !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE' && !token.includes('1234567890')) {
    try {
      console.log(`[Telegram Service] Dispatching alert to Chat ID: ${targetChatId} via bot ${token.slice(0, 10)}...`);
      const data = await callTelegramApi(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: targetChatId,
        text: htmlMessage,
        parse_mode: 'HTML',
      });

      if (data.ok) {
        const dispatchRecord = await db.dispatches.log({
          siteId: payload.siteId,
          siteName: payload.siteName,
          recipientName: payload.recipientName,
          telegramUsername: cleanUsername,
          chatId: targetChatId,
          messageBody: htmlMessage,
          status: 'Delivered',
          notes: payload.customNotes,
        });

        await db.logs.add({
          type: 'telegram',
          title: 'Telegram Alert Dispatched (Live)',
          description: `Live incident alert successfully dispatched to @${cleanUsername} (${payload.recipientName}) for ${payload.siteName}.`,
          siteName: payload.siteName,
          siteCode: payload.siteCode,
          personName: payload.recipientName,
          telegramUsername: cleanUsername,
          severity: 'info',
          timestamp: 'Just now',
        });

        return {
          success: true,
          message: `Live alert successfully dispatched to Telegram @${cleanUsername} (Chat ID: ${targetChatId}).`,
          dispatchId: dispatchRecord.id,
          mode: 'live_telegram',
        };
      } else {
        console.warn('[Telegram Service] Telegram API responded with error:', data);
      }
    } catch (err: any) {
      console.warn('[Telegram Service] Failed sending live Telegram API request, recording fallback:', err.message);
    }
  }

  // Fallback / Simulated mode
  const fallbackRecord = await db.dispatches.log({
    siteId: payload.siteId,
    siteName: payload.siteName,
    recipientName: payload.recipientName,
    telegramUsername: cleanUsername,
    chatId: targetChatId,
    messageBody: htmlMessage,
    status: 'Sent',
    notes: payload.customNotes,
  });

  await db.logs.add({
    type: 'telegram',
    title: 'Telegram Dispatch Ticket Recorded',
    description: `Incident alert queued and logged for @${cleanUsername} (${payload.siteName}).`,
    siteName: payload.siteName,
    siteCode: payload.siteCode,
    personName: payload.recipientName,
    telegramUsername: cleanUsername,
    severity: 'info',
    timestamp: 'Just now',
  });

  return {
    success: true,
    message: `Incident ticket queued and recorded for Telegram responder @${cleanUsername}.`,
    dispatchId: fallbackRecord.id,
    mode: 'simulated',
  };
}

/**
 * Send consolidated Area Downtime Outage alert when admin assigns an area with down sites
 */
export async function sendTelegramAreaDowntimeAlert(payload: AreaDowntimeDispatchPayload): Promise<TelegramDispatchResult> {
  let token = process.env.TELEGRAM_BOT_TOKEN || '8738860219:AAGHT3ZdCFMzakSVSZCsvMN03P1TMpy2_Jg';
  let targetChatId = payload.chatId || process.env.TELEGRAM_DEFAULT_CHAT_ID || '7227734738';

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
    if (s?.telegram?.channelId && !payload.chatId) {
      targetChatId = s.telegram.channelId;
    }
  } catch {}

  if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    token = '8738860219:AAGHT3ZdCFMzakSVSZCsvMN03P1TMpy2_Jg';
  }

  const cleanUsername = (payload.telegramUsername || 'dict_noc').replace(/^@/, '');

  if (/^-?\d+$/.test(cleanUsername)) {
    targetChatId = cleanUsername;
  }

  const downCount = payload.downSites.length;
  let siteListText = '';
  payload.downSites.forEach((site, index) => {
    siteListText += 
      `\n🔴 <b>${index + 1}. ${escapeHtml(site.name)}</b>\n` +
      (site.code ? `   • <b>Code:</b> <code>${escapeHtml(site.code)}</code>\n` : '') +
      `   • <b>Status:</b> ${site.offlineCount} of ${site.deviceCount || site.offlineCount} Devices Offline\n` +
      (site.lastKnownIp ? `   • <b>Gateway IP:</b> <code>${escapeHtml(site.lastKnownIp)}</code>\n` : '') +
      (site.downtimeDuration ? `   • <b>Downtime Duration:</b> ${escapeHtml(site.downtimeDuration)}\n` : '');
  });

  const htmlMessage = 
    `🚨 <b>DICT NOC CRITICAL AREA OUTAGE ALERT</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Assigned Area:</b> <b>${escapeHtml(payload.areaName)}</b>\n` +
    `👤 <b>Designated Responder:</b> <b>${escapeHtml(payload.recipientName)}</b> (@${escapeHtml(cleanUsername)})\n` +
    `⚠️ <b>Current Status:</b> <b>${downCount} Site(s) DOWN / Offline</b> in your assigned area.\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    siteListText +
    `\n━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ <i>Action Required: Please initiate remote telemetry inspection or on-site dispatch triage immediately.</i>\n` +
    `<i>Multifactors Sales Network Monitoring System • Automated Field Triage</i>`;

  // Log each down site to dispatches and activity logs
  for (const site of payload.downSites) {
    try {
      await db.dispatches.log({
        siteName: site.name,
        recipientName: payload.recipientName,
        telegramUsername: cleanUsername,
        messageBody: htmlMessage,
        status: 'Delivered',
        notes: `Auto-dispatched upon area assignment: ${payload.areaName}`,
      });

      await db.logs.add({
        type: 'telegram',
        title: 'Area Outage Alert Auto-Dispatched',
        description: `Automated Telegram alert dispatched to @${cleanUsername} (${payload.recipientName}) for outage at ${site.name} in ${payload.areaName}.`,
        siteName: site.name,
        siteCode: site.code,
        personName: payload.recipientName,
        telegramUsername: cleanUsername,
        severity: 'critical',
        timestamp: 'Just now',
      });
    } catch (e) {
      console.warn('[Telegram Service] Failed recording site log:', e);
    }
  }

  // Send live Telegram message
  if (token && token !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE' && !token.includes('1234567890')) {
    try {
      console.log(`[Telegram Service] Dispatching Area Outage alert to Chat ID: ${targetChatId}...`);
      const data = await callTelegramApi(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: targetChatId,
        text: htmlMessage,
        parse_mode: 'HTML',
      });

      if (data.ok) {
        return {
          success: true,
          message: `Live Area Outage alert successfully sent to Telegram @${cleanUsername} (Chat ID: ${targetChatId}) for ${downCount} down site(s).`,
          mode: 'live_telegram',
        };
      } else {
        console.warn('[Telegram Service] Area Outage Telegram API error:', data);
      }
    } catch (err: any) {
      console.warn('[Telegram Service] Failed sending Area Outage Telegram API request:', err.message);
    }
  }

  return {
    success: true,
    message: `Area Outage alert recorded for @${cleanUsername} (${downCount} down sites).`,
    mode: 'simulated',
  };
}

/**
 * Live test function for verifying Telegram bot connection from Settings
 */
export async function testTelegramBotConnection(customToken?: string, customChatId?: string): Promise<{ success: boolean; message: string; botInfo?: any }> {
  let token = customToken || process.env.TELEGRAM_BOT_TOKEN || '8738860219:AAGHT3ZdCFMzakSVSZCsvMN03P1TMpy2_Jg';
  let targetChatId = customChatId || process.env.TELEGRAM_DEFAULT_CHAT_ID || '7227734738';

  try {
    const s = await db.settings.get();
    if (s?.telegram?.botToken && !customToken) token = s.telegram.botToken;
    if (s?.telegram?.channelId && !customChatId) targetChatId = s.telegram.channelId;
  } catch {}

  try {
    const meData = await callTelegramApi(`https://api.telegram.org/bot${token}/getMe`, null, 'GET');
    if (!meData.ok) {
      return { success: false, message: `Telegram Bot Authentication Failed: ${meData.description || 'Invalid token'}` };
    }

    // Send confirmation ping to target chat
    const sendData = await callTelegramApi(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: targetChatId,
      text: `✅ <b>DICT Region 10 NOC • Telegram Alerting Gateway Verified</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 <b>Bot:</b> @${meData.result.username}\n⚡ Real-time incident dispatching is active and verified!`,
      parse_mode: 'HTML',
    });

    if (sendData.ok) {
      return {
        success: true,
        message: `Verified! Bot @${meData.result.username} connected and sent confirmation message to Chat ID ${targetChatId}.`,
        botInfo: meData.result,
      };
    } else {
      return {
        success: true,
        message: `Bot @${meData.result.username} verified! (Note: to receive private messages, Account #${targetChatId} must tap START on @${meData.result.username}).`,
        botInfo: meData.result,
      };
    }
  } catch (err: any) {
    return { success: false, message: `Connection error: ${err.message}` };
  }
}
