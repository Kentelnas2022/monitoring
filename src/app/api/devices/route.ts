import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { SiteDevice } from '@/types/dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const siteName = searchParams.get('siteName');

    if (!siteId && !siteName) {
      return NextResponse.json({ success: false, message: 'siteId or siteName is required', devices: [] }, { status: 400 });
    }

    const pool = await getDbPool();
    if (pool) {
      let query = `
        SELECT d.id, d.site_id, d.device_name, d.model, d.serial_number, d.mac_address, d.ip_address, d.device_type, d.status
        FROM devices d
        LEFT JOIN sites s ON d.site_id = s.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (siteId) {
        query += ' AND (d.site_id = ? OR s.id = ? OR s.code = ?)';
        params.push(siteId, siteId, siteId);
      } else if (siteName) {
        query += ' AND s.name = ?';
        params.push(siteName);
      }

      query += ` ORDER BY d.status = 'Offline' DESC, d.device_type = 'Gateway' DESC, d.id ASC`;

      const [rows]: any = await pool.query(query, params).catch(() => [[]]);

      if (Array.isArray(rows) && rows.length > 0) {
        const devices: SiteDevice[] = rows.map((r: any) => {
          let model = r.model;
          if (!model || model === 'EAP') model = 'RG-RAP2200(E)';
          else if (model === 'EGW') model = 'RG-EG105G-P';
          else if (model === 'ESW') model = 'RG-ES205GC-P';

          return {
            id: r.id,
            name: r.device_name,
            model,
            serialNumber: r.serial_number,
            macAddress: r.mac_address,
            ipAddress: r.ip_address,
            deviceType: r.device_type,
            status: r.status,
          };
        });

        return NextResponse.json({ success: true, devices });
      }

      if (siteId) {
        const [directRows]: any = await pool.query(
          `SELECT id, site_id, device_name, model, serial_number, mac_address, ip_address, device_type, status
           FROM devices
           WHERE site_id = ?
           ORDER BY device_type = 'Gateway' DESC, id ASC`,
          [siteId]
        ).catch(() => [[]]);

        if (Array.isArray(directRows) && directRows.length > 0) {
          const devices: SiteDevice[] = directRows.map((r: any) => {
            let model = r.model;
            if (!model || model === 'EAP') model = 'RG-RAP2200(E)';
            else if (model === 'EGW') model = 'RG-EG105G-P';
            else if (model === 'ESW') model = 'RG-ES205GC-P';

            return {
              id: r.id,
              name: r.device_name,
              model,
              serialNumber: r.serial_number,
              macAddress: r.mac_address,
              ipAddress: r.ip_address,
              deviceType: r.device_type,
              status: r.status,
            };
          });

          return NextResponse.json({ success: true, devices });
        }
      }
    }

    return NextResponse.json({ success: true, devices: [] });
  } catch (err: any) {
    console.error('[API /api/devices error]', err);
    return NextResponse.json({ success: false, message: err.message, devices: [] }, { status: 500 });
  }
}
