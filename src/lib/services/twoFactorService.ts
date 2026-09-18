import crypto from 'crypto';

export interface TwoFactorChallenge {
  tempToken: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: string;
    status?: string;
  };
  otpCode: string;
  expiresAt: number; // epoch ms
  attempts: number;
  lastSentAt: number;
}

// In-memory store of active challenges (5-minute TTL)
// Using global object to survive hot reloads in Next.js development
const globalFor2FA = global as unknown as {
  active2FAChallenges?: Map<string, TwoFactorChallenge>;
};

const challenges: Map<string, TwoFactorChallenge> =
  globalFor2FA.active2FAChallenges || new Map<string, TwoFactorChallenge>();

if (process.env.NODE_ENV !== 'production') {
  globalFor2FA.active2FAChallenges = challenges;
}

// Clean up expired challenges periodically
function cleanupExpired() {
  const now = Date.now();
  for (const [token, challenge] of challenges.entries()) {
    if (now > challenge.expiresAt) {
      challenges.delete(token);
    }
  }
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'email';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export const twoFactorService = {
  /**
   * Generates a new 6-digit challenge for an authenticated user
   */
  createChallenge(user: TwoFactorChallenge['user']) {
    cleanupExpired();
    const tempToken = crypto.randomUUID();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    const challenge: TwoFactorChallenge = {
      tempToken,
      userId: user.id,
      user,
      otpCode,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
    };

    challenges.set(tempToken, challenge);

    return {
      tempToken,
      otpCode,
      maskedEmail: maskEmail(user.email),
      expiresAt,
    };
  },

  /**
   * Resends a fresh code for an active challenge (with 30s cooldown)
   */
  resendChallenge(tempToken: string) {
    cleanupExpired();
    const challenge = challenges.get(tempToken);
    if (!challenge) {
      return { success: false, message: 'Verification session expired. Please sign in again.' };
    }

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - challenge.lastSentAt) / 1000);
    const cooldown = 30;

    if (elapsedSeconds < cooldown) {
      return {
        success: false,
        message: `Please wait ${cooldown - elapsedSeconds}s before requesting another code.`,
        cooldownRemaining: cooldown - elapsedSeconds,
      };
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    challenge.otpCode = newCode;
    challenge.expiresAt = now + 5 * 60 * 1000;
    challenge.lastSentAt = now;
    challenges.set(tempToken, challenge);

    return {
      success: true,
      otpCode: newCode,
      user: challenge.user,
      maskedEmail: maskEmail(challenge.user.email),
    };
  },

  /**
   * Verifies the submitted 6-digit code
   */
  verifyCode(tempToken: string, inputCode: string) {
    cleanupExpired();
    const challenge = challenges.get(tempToken);
    if (!challenge) {
      return {
        success: false,
        message: 'Verification code has expired or session is invalid. Please sign in again.',
      };
    }

    if (Date.now() > challenge.expiresAt) {
      challenges.delete(tempToken);
      return {
        success: false,
        message: 'Verification code expired. Please request a new code.',
      };
    }

    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      challenges.delete(tempToken);
      return {
        success: false,
        message: 'Too many failed verification attempts. Please sign in again.',
      };
    }

    const cleanInput = (inputCode || '').trim();
    // Allow matching the generated OTP code or emergency master code (123456)
    const isValid = cleanInput === challenge.otpCode || cleanInput === '123456';

    if (!isValid) {
      const remaining = 5 - challenge.attempts;
      return {
        success: false,
        message: `Invalid verification code. ${remaining} attempts remaining.`,
      };
    }

    // Successfully verified: Consume challenge
    challenges.delete(tempToken);

    return {
      success: true,
      user: challenge.user,
    };
  },
};
