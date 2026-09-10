import bcrypt from 'bcryptjs';

/**
 * Cryptographically hash a plaintext password using bcrypt with salt rounds = 10.
 */
export function hashPassword(plainText: string): string {
  if (!plainText) throw new Error('Password cannot be empty');
  return bcrypt.hashSync(plainText, 10);
}

/**
 * Verify a plaintext password against a stored hash or legacy password.
 * Supports:
 * - Standard bcrypt hashes ($2a$, $2b$, $2y$)
 * - Legacy plain text passwords (during transitional phase)
 */
export function verifyPassword(plainText: string, hashOrPlain: string): boolean {
  if (!plainText || !hashOrPlain) return false;

  const trimmedAttempt = plainText.trim();
  const trimmedStored = hashOrPlain.trim();

  // If stored as bcrypt hash
  if (trimmedStored.startsWith('$2')) {
    try {
      return bcrypt.compareSync(trimmedAttempt, trimmedStored);
    } catch (err) {
      console.error('[Auth] Error comparing bcrypt hash:', err);
      return false;
    }
  }

  // Fallback: direct plain text comparison for legacy unhashed passwords
  return trimmedAttempt === trimmedStored;
}
