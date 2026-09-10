import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.max(1, Number(searchParams.get('limit') || 10));
    const category = searchParams.get('category') || 'all';
    const action = searchParams.get('action');
    const search = (searchParams.get('q') || '').toLowerCase().trim();

    if (action === 'reset_aligned') {
      await db.logs.clear();
      const initialLogs = [
        {
          type: 'system' as const,
          title: 'Ruijie Cloud Telemetry Auto-Sync',
          description: 'Synchronized 123 facilities (123 devices, 0 active alarms) via Ruijie Open API (open1312043d9a82).',
          siteName: 'Northern Mindanao',
          siteCode: 'RJ-123',
          severity: 'info' as const,
          timestamp: 'Just now',
        },
        {
          type: 'telegram' as const,
          title: 'Telegram Outage Gateway Connected',
          description: 'Authenticated @multifactors_bot for automated NOC downtime dispatching and incident alerts.',
          siteName: 'DICT Region 10 NOC',
          siteCode: 'NOC-R10',
          personName: 'Kenn',
          telegramUsername: '7227734738',
          severity: 'info' as const,
          timestamp: '1 hour ago',
        },
        {
          type: 'assignment' as const,
          title: 'Area Assignment: Lanao del Norte',
          description: 'Nathan Salvedia designated to Lanao del Norte triage roster (63 monitored sites, Telegram ID: 8406521445).',
          siteName: 'Lanao del Norte',
          siteCode: 'LDN-NOC',
          personName: 'Nathan Salvedia',
          telegramUsername: '8406521445',
          severity: 'info' as const,
          timestamp: '2 hours ago',
        },
        {
          type: 'assignment' as const,
          title: 'Area Assignment: Camiguin',
          description: 'Kenn designated to Camiguin island triage roster (59 monitored sites, Telegram ID: 7227734738).',
          siteName: 'Camiguin',
          siteCode: 'CAM-NOC',
          personName: 'Kenn',
          telegramUsername: '7227734738',
          severity: 'info' as const,
          timestamp: '3 hours ago',
        },
        {
          type: 'assignment' as const,
          title: 'Area Assignment: Cagayan de Oro City',
          description: 'Engr. Engel Montero designated to Cagayan de Oro City triage roster (Project OJT, Telegram ID: 7227734738).',
          siteName: 'Cagayan de Oro City',
          siteCode: 'CDO-OJT',
          personName: 'Engr. Engel Montero',
          telegramUsername: 'emontero_dict',
          severity: 'info' as const,
          timestamp: '4 hours ago',
        },
        {
          type: 'assignment' as const,
          title: 'Area Assignment: Misamis Occidental',
          description: 'Kenn designated to Misamis Occidental standby coverage roster (Telegram ID: 7227734738).',
          siteName: 'Misamis Occidental',
          siteCode: 'MO-STDBY',
          personName: 'Kenn',
          telegramUsername: '7227734738',
          severity: 'info' as const,
          timestamp: '5 hours ago',
        },
        {
          type: 'assignment' as const,
          title: 'Area Assignment: Lanao del Sur',
          description: 'Nathan Salvedia designated to Lanao del Sur standby coverage roster (Telegram ID: 8406521445).',
          siteName: 'Lanao del Sur',
          siteCode: 'LDS-STDBY',
          personName: 'Nathan Salvedia',
          telegramUsername: '8406521445',
          severity: 'info' as const,
          timestamp: '6 hours ago',
        },
      ];

      for (const l of initialLogs) {
        await db.logs.add(l);
      }
    }

    const allLogs = await db.logs.getAll();

    // Filter by category and search
    const filtered = allLogs.filter((log) => {
      if (category !== 'all' && log.type !== category) return false;
      if (search) {
        const matchTitle = log.title.toLowerCase().includes(search);
        const matchDesc = log.description.toLowerCase().includes(search);
        const matchSite = log.siteName?.toLowerCase().includes(search);
        const matchPerson = log.personName?.toLowerCase().includes(search);
        const matchTelegram = log.telegramUsername?.toLowerCase().includes(search);
        return matchTitle || matchDesc || matchSite || matchPerson || matchTelegram;
      }
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    // Compute stats
    const stats = {
      total: allLogs.length,
      telegram: allLogs.filter((l) => l.type === 'telegram').length,
      outages: allLogs.filter((l) => l.type === 'outage').length,
      assignments: allLogs.filter((l) => l.type === 'assignment').length,
      recovery: allLogs.filter((l) => l.type === 'recovery').length,
      system: allLogs.filter((l) => l.type === 'system').length,
    };

    return NextResponse.json({
      success: true,
      data: paginated,
      stats,
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
      { success: false, message: error.message || 'Failed fetching activity logs.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'reset_aligned') {
      await db.logs.clear();
      const logs = [
        {
          id: 'act-sync-01',
          type: 'system' as const,
          title: 'Ruijie Cloud Telemetry Auto-Sync',
          description: 'Synchronized 123 facilities (123 devices, 0 active alarms) via Ruijie Open API (open1312043d9a82).',
          siteName: 'Northern Mindanao',
          siteCode: 'RJ-123',
          severity: 'info' as const,
          timestamp: 'Just now',
        },
        {
          id: 'act-tg-01',
          type: 'telegram' as const,
          title: 'Telegram Outage Gateway Connected',
          description: 'Authenticated @multifactors_bot for automated NOC downtime dispatching and incident alerts.',
          siteName: 'DICT Region 10 NOC',
          siteCode: 'NOC-R10',
          personName: 'Kenn',
          telegramUsername: '7227734738',
          severity: 'info' as const,
          timestamp: '1 hour ago',
        },
        {
          id: 'act-asg-ldn',
          type: 'assignment' as const,
          title: 'Area Assignment: Lanao del Norte',
          description: 'Nathan Salvedia designated to Lanao del Norte triage roster (63 monitored sites, Telegram ID: 8406521445).',
          siteName: 'Lanao del Norte',
          siteCode: 'LDN-NOC',
          personName: 'Nathan Salvedia',
          telegramUsername: '8406521445',
          severity: 'info' as const,
          timestamp: '2 hours ago',
        },
        {
          id: 'act-asg-cam',
          type: 'assignment' as const,
          title: 'Area Assignment: Camiguin',
          description: 'Kenn designated to Camiguin island triage roster (59 monitored sites, Telegram ID: 7227734738).',
          siteName: 'Camiguin',
          siteCode: 'CAM-NOC',
          personName: 'Kenn',
          telegramUsername: '7227734738',
          severity: 'info' as const,
          timestamp: '3 hours ago',
        },
        {
          id: 'act-asg-cdo',
          type: 'assignment' as const,
          title: 'Area Assignment: Cagayan de Oro City',
          description: 'Engr. Engel Montero designated to Cagayan de Oro City triage roster (Project OJT, Telegram ID: 7227734738).',
          siteName: 'Cagayan de Oro City',
          siteCode: 'CDO-OJT',
          personName: 'Engr. Engel Montero',
          telegramUsername: 'emontero_dict',
          severity: 'info' as const,
          timestamp: '4 hours ago',
        },
        {
          id: 'act-asg-misocc',
          type: 'assignment' as const,
          title: 'Area Assignment: Misamis Occidental',
          description: 'Kenn designated to Misamis Occidental standby coverage roster (Telegram ID: 7227734738).',
          siteName: 'Misamis Occidental',
          siteCode: 'MO-STDBY',
          personName: 'Kenn',
          telegramUsername: '7227734738',
          severity: 'info' as const,
          timestamp: '5 hours ago',
        },
        {
          id: 'act-asg-lds',
          type: 'assignment' as const,
          title: 'Area Assignment: Lanao del Sur',
          description: 'Nathan Salvedia designated to Lanao del Sur standby coverage roster (Telegram ID: 8406521445).',
          siteName: 'Lanao del Sur',
          siteCode: 'LDS-STDBY',
          personName: 'Nathan Salvedia',
          telegramUsername: '8406521445',
          severity: 'info' as const,
          timestamp: '6 hours ago',
        },
      ];

      for (const l of logs) {
        await db.logs.add(l);
      }

      return NextResponse.json({ success: true, message: 'Activity logs aligned with real system milestones.' });
    }

    const created = await db.logs.add(body);
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.logs.clear();
    return NextResponse.json({
      success: true,
      message: 'Activity logs cleared successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed clearing logs.' },
      { status: 500 }
    );
  }
}
