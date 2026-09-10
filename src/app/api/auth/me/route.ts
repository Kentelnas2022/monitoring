import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET() {
  const pool = await getDbPool();
  if (pool) {
    try {
      const [rows]: any = await pool.query(
        'SELECT id, full_name as fullName, email, username, role, status FROM users ORDER BY created_at ASC LIMIT 1'
      );
      if (rows && rows.length > 0) {
        return NextResponse.json({
          authenticated: true,
          user: rows[0],
        });
      }
    } catch (err: any) {
      console.error('[API auth/me error]', err);
    }
  }

  return NextResponse.json({
    authenticated: false,
    user: null,
  });
}
