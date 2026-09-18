import { NextRequest, NextResponse } from 'next/server';
import { twoFactorService } from '@/lib/services/twoFactorService';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { tempToken, code } = await req.json();

    if (!tempToken || !code) {
      return NextResponse.json(
        { success: false, message: 'Verification token and 6-digit code are required.' },
        { status: 400 }
      );
    }

    const verifyResult = twoFactorService.verifyCode(tempToken, code);

    if (!verifyResult.success || !verifyResult.user) {
      return NextResponse.json(
        { success: false, message: verifyResult.message || 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    // Log successful 2FA verification to audit logs
    await db.logs.add({
      type: 'system',
      title: '2-Step Verification Succeeded',
      description: `User ${verifyResult.user.fullName} (${verifyResult.user.username}) completed 2-Step Verification and accessed the monitoring console.`,
      siteName: 'Central NOC Command Portal',
      siteCode: 'NOC-HQ',
      personName: verifyResult.user.fullName,
      telegramUsername: verifyResult.user.username,
      severity: 'info',
      timestamp: 'Just now',
    });

    const res = NextResponse.json({
      success: true,
      user: verifyResult.user,
      message: '2-Step Verification successful. Access granted.',
    });

    // Set production authentication cookies
    res.cookies.set('monitoring_auth_session', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      httpOnly: false,
    });

    res.cookies.set(
      'monitoring_auth_user',
      encodeURIComponent(JSON.stringify(verifyResult.user)),
      {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        httpOnly: false,
      }
    );

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Verification service error.' },
      { status: 500 }
    );
  }
}
