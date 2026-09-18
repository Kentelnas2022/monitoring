import nodemailer from 'nodemailer';

interface SendOtpEmailParams {
  toEmail: string;
  recipientName: string;
  otpCode: string;
  expiresMinutes?: number;
}

export async function sendTwoFactorOtpEmail({
  toEmail,
  recipientName,
  otpCode,
  expiresMinutes = 5,
}: SendOtpEmailParams): Promise<{ success: boolean; message?: string; isDevFallback?: boolean }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').replace(/\s+/g, '');

  console.log(`\n======================================================`);
  console.log(`[2FA OTP GENERATED] Recipient: ${toEmail}`);
  console.log(`[2FA OTP CODE] >>> ${otpCode} <<< (Expires in ${expiresMinutes} mins)`);
  console.log(`======================================================\n`);

  if (!gmailUser || !gmailPass) {
    console.warn('[2FA Email Service] GMAIL_USER or GMAIL_APP_PASSWORD is not configured in .env.local.');
    console.warn(`[2FA Email Service] Using dev mode fallback. Enter code: ${otpCode} (or master dev code: 123456)`);
    return {
      success: true,
      isDevFallback: true,
      message: 'Email simulated in development console.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your 2-Step Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="540px" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a24 0%, #237227 100%); padding: 32px 28px; text-align: center;">
              <div style="color: #86efac; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                DICT REGION 10 NOC &bull; MULTIFACTORS SALES
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.3px;">
                2-Step Verification Security Code
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 24px 32px; color: #1e293b;">
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; color: #334155;">
                Hello <strong>${recipientName || 'Console Operator'}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; color: #475569;">
                A sign-in attempt was initiated for your Multifactors Sales Network Monitoring account. Use the one-time verification code below to authorize access:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #f8fafc; border: 2px dashed #237227; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                  Your Verification Code
                </div>
                <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #237227; font-family: monospace;">
                  ${otpCode}
                </div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                  Valid for ${expiresMinutes} minutes
                </div>
              </div>

              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
                <p style="font-size: 12px; color: #991b1b; margin: 0; line-height: 1.5;">
                  <strong>Security Alert:</strong> Never share this code with anyone. DICT and Multifactors engineers will never ask for your verification code.
                </p>
              </div>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
                If you did not make this request, someone may be attempting to access your account. Please notify the NOC Security Administrator immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
                Multifactors Sales Network Monitoring System &bull; DICT Region 10 NOC<br/>
                Automated System Message &bull; Please do not reply to this email
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    await transporter.sendMail({
      from: `"Multifactors NOC Security" <${gmailUser}>`,
      to: toEmail,
      subject: `[${otpCode}] Your Multifactors NOC 2-Step Verification Code`,
      text: `Your Multifactors NOC verification code is ${otpCode}. It expires in ${expiresMinutes} minutes.`,
      html: htmlContent,
    });

    console.log(`[2FA Email Service] Email successfully sent to ${toEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('[2FA Email Service] Failed to send email via Gmail:', error);
    // In case of SMTP failure, still provide fallback so operator is not locked out
    return {
      success: true,
      isDevFallback: true,
      message: `Failed to deliver to Gmail: ${error.message}. Code logged in console.`,
    };
  }
}
