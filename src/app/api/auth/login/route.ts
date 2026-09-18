import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username or email, and password are required.' },
        { status: 400 }
      );
    }

    const authResult = await db.users.authenticate(username, password);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Invalid credentials. Please verify your username/email and password.' },
        { status: 401 }
      );
    }

    // Direct authentication (OTP disabled)
    await db.logs.add({
      type: 'system',
      title: 'Console Operator Login',
      description: `User ${authResult.user.fullName} (${authResult.user.username}) authenticated directly to the NOC command center.`,
      siteName: 'Central NOC Command Portal',
      siteCode: 'NOC-HQ',
      personName: authResult.user.fullName,
      telegramUsername: authResult.user.username,
      severity: 'info',
      timestamp: 'Just now',
    });

    const res = NextResponse.json({
      success: true,
      user: authResult.user,
      message: 'Authentication successful.',
    });

    res.cookies.set('monitoring_auth_session', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      httpOnly: false,
    });

    res.cookies.set('monitoring_auth_user', encodeURIComponent(JSON.stringify(authResult.user)), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      httpOnly: false,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Authentication service error.' },
      { status: 500 }
    );
  }
}
