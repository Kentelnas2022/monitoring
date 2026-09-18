import { NextRequest, NextResponse } from 'next/server';
import { twoFactorService } from '@/lib/services/twoFactorService';
import { sendTwoFactorOtpEmail } from '@/lib/services/emailService';

export async function POST(req: NextRequest) {
  try {
    const { tempToken } = await req.json();

    if (!tempToken) {
      return NextResponse.json(
        { success: false, message: 'Verification session token is required.' },
        { status: 400 }
      );
    }

    const resendResult = twoFactorService.resendChallenge(tempToken);

    if (!resendResult.success || !resendResult.user || !resendResult.otpCode) {
      const status = resendResult.cooldownRemaining ? 429 : 400;
      return NextResponse.json(
        {
          success: false,
          message: resendResult.message || 'Unable to resend code.',
          cooldownRemaining: resendResult.cooldownRemaining,
        },
        { status }
      );
    }

    // Send fresh OTP email
    await sendTwoFactorOtpEmail({
      toEmail: resendResult.user.email,
      recipientName: resendResult.user.fullName,
      otpCode: resendResult.otpCode,
    });

    return NextResponse.json({
      success: true,
      message: `A fresh 6-digit code has been dispatched to ${resendResult.maskedEmail}.`,
      maskedEmail: resendResult.maskedEmail,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to resend verification code.' },
      { status: 500 }
    );
  }
}
