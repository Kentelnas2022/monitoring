import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword, identifier } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Both current password and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const result = await db.users.changePassword(
      identifier || '',
      currentPassword,
      newPassword
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[API change-password error]', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error changing password.' },
      { status: 500 }
    );
  }
}
