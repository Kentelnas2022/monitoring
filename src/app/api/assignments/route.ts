import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendTelegramAreaDowntimeAlert } from '@/lib/services/telegramService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.max(1, Number(searchParams.get('limit') || 10));
    const search = (searchParams.get('q') || '').toLowerCase().trim();

    const allAssignments: any = await db.assignments.getAll();

    // Filter by search
    const filtered = allAssignments.filter((a: any) => {
      if (!search) return true;
      return (
        a.area.toLowerCase().includes(search) ||
        a.personName.toLowerCase().includes(search) ||
        a.telegram.toLowerCase().includes(search)
      );
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        startItem: total === 0 ? 0 : startIndex + 1,
        endItem: Math.min(startIndex + limit, total),
      },
      isLiveDb: await db.isLive(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed fetching assignments.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { area, personName, phone, telegram, chatId, role } = body;

    if (!area || !personName || !telegram) {
      return NextResponse.json(
        { success: false, message: 'Area, person name, and Telegram handle are required.' },
        { status: 400 }
      );
    }

    const cleanTelegram = telegram.trim().replace(/^@/, '');
    const cleanChatId = chatId ? String(chatId).trim() : (/^\d+$/.test(cleanTelegram) ? cleanTelegram : '7227734738');
    const cleanPhone = phone?.trim() || '+63 900 000 0000';
    const cleanRole = role || 'Designated Area Responder';

    // 1. Create assignment record
    const created = await db.assignments.add({
      area: area.trim(),
      personName: personName.trim(),
      phone: cleanPhone,
      telegram: cleanTelegram,
      chatId: cleanChatId,
      role: cleanRole,
    });

    // 2. Link all matching sites in this area to the new assignment handler
    await db.sites.updateAreaHandler(created.id, area.trim(), {
      name: personName.trim(),
      phone: cleanPhone,
      telegram: cleanTelegram,
      role: cleanRole,
    });

    await db.logs.add({
      type: 'assignment',
      title: 'New Area Assignment Added',
      description: `${personName} designated to ${area} triage roster (Telegram ID: ${cleanChatId}).`,
      personName,
      telegramUsername: cleanTelegram,
      severity: 'info',
      timestamp: 'Just now',
    });

    // 3. AUTO-DISPATCH CHECK: Check if any sites in this assigned area are DOWN
    const norm = area.toLowerCase().replace(/\s+area$/i, '').trim();
    const allSites = await db.sites.getAll();
    const matchingSites = allSites.filter((s: any) => {
      const p = (s.province || '').toLowerCase();
      const r = (s.region || '').toLowerCase();
      const n = (s.name || '').toLowerCase();
      return p === norm || p.includes(norm) || norm.includes(p) || r.includes(norm) || n.includes(norm);
    });

    const downSites = matchingSites.filter((s: any) => s.status === 'Downtime' || s.offlineCount > 0);
    let dispatchResult = null;

    if (downSites.length > 0) {
      console.log(`[Area Assignment Auto-Dispatch] Area "${area}" has ${downSites.length} down sites! Dispatched alert to ${personName} (Chat ID: ${cleanChatId}).`);
      dispatchResult = await sendTelegramAreaDowntimeAlert({
        areaName: area,
        recipientName: personName.trim(),
        telegramUsername: cleanTelegram,
        chatId: cleanChatId,
        downSites: downSites.map((s: any) => ({
          name: s.name,
          code: s.code,
          offlineCount: s.offlineCount,
          deviceCount: s.deviceCount,
          lastKnownIp: s.lastKnownIp,
          downtimeDuration: s.downtimeDuration,
          severity: s.severity,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data: created,
      downSitesCount: downSites.length,
      dispatchResult,
      message: downSites.length > 0
        ? `Area assignment created! Auto-dispatched Telegram alert to ${personName} (Account ID: ${cleanChatId}) for ${downSites.length} down site(s).`
        : 'Area assignment created successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed adding assignment.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, area, personName, phone, telegram, chatId, role } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Assignment ID is required.' },
        { status: 400 }
      );
    }

    const cleanTelegram = telegram ? telegram.trim().replace(/^@/, '') : undefined;
    const cleanChatId = chatId !== undefined ? String(chatId).trim() : (cleanTelegram && /^\d+$/.test(cleanTelegram) ? cleanTelegram : undefined);
    const cleanPhone = phone ? phone.trim() : undefined;
    const cleanRole = role || 'Designated Area Responder';

    const updated = await db.assignments.update(id, {
      area,
      personName,
      phone: cleanPhone,
      telegram: cleanTelegram,
      chatId: cleanChatId,
    });

    // Update sites associated with this area
    if (area && personName && cleanTelegram) {
      await db.sites.updateAreaHandler(id, area.trim(), {
        name: personName.trim(),
        phone: cleanPhone || '+63 900 000 0000',
        telegram: cleanTelegram,
        role: cleanRole,
      });

      // AUTO-DISPATCH CHECK: If any sites in this assigned area are DOWN, send alert!
      const norm = area.toLowerCase().replace(/\s+area$/i, '').trim();
      const allSites = await db.sites.getAll();
      const matchingSites = allSites.filter((s: any) => {
        const p = (s.province || '').toLowerCase();
        const r = (s.region || '').toLowerCase();
        const n = (s.name || '').toLowerCase();
        return p === norm || p.includes(norm) || norm.includes(p) || r.includes(norm) || n.includes(norm);
      });

      const downSites = matchingSites.filter((s: any) => s.status === 'Downtime' || s.offlineCount > 0);

      if (downSites.length > 0) {
        console.log(`[Area Assignment Auto-Dispatch] Area "${area}" updated and has ${downSites.length} down sites! Dispatching alert to ${personName} (Account ID: ${cleanChatId || 'default'}).`);
        await sendTelegramAreaDowntimeAlert({
          areaName: area,
          recipientName: personName.trim(),
          telegramUsername: cleanTelegram,
          chatId: cleanChatId,
          downSites: downSites.map((s: any) => ({
            name: s.name,
            code: s.code,
            offlineCount: s.offlineCount,
            deviceCount: s.deviceCount,
            lastKnownIp: s.lastKnownIp,
            downtimeDuration: s.downtimeDuration,
            severity: s.severity,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Area assignment updated successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed updating assignment.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Assignment ID is required.' },
        { status: 400 }
      );
    }

    await db.assignments.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Area assignment deleted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed deleting assignment.' },
      { status: 500 }
    );
  }
}
