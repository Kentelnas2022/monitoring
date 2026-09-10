import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  res.cookies.set('monitoring_auth_session', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });

  res.cookies.set('monitoring_auth_user', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });

  return res;
}
