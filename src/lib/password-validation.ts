/**
 * Shared password strength validation — used on both client and server.
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 10) {
    return { valid: false, error: "Şifre en az 10 karakter olmalıdır." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Şifre en az 1 büyük harf içermelidir." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Şifre en az 1 rakam içermelidir." };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: "Şifre en az 1 özel karakter içermelidir." };
  }
  return { valid: true };
}

/** Human-readable password requirements for UI hints */
export const PASSWORD_REQUIREMENTS = [
  "En az 10 karakter",
  "En az 1 büyük harf (A-Z)",
  "En az 1 rakam (0-9)",
  "En az 1 özel karakter (!@#$...)",
];
