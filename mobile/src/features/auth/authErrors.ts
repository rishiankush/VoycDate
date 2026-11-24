const MESSAGES: Record<string, string> = {
  'auth/invalid-phone-number': 'That phone number doesn’t look right. Check it and try again.',
  'auth/missing-phone-number': 'Enter your phone number to continue.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/quota-exceeded': 'We can’t send codes right now. Please try again later.',
  'auth/captcha-check-failed': 'The security check failed. Please try again.',
  'auth/captcha-cancelled': 'Security check cancelled. Tap Send Code to try again.',
  'auth/invalid-verification-code': 'That code isn’t right. Check the SMS and try again.',
  'auth/code-expired': 'This code has expired. Request a new one.',
  'auth/session-expired': 'This code has expired. Request a new one.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/operation-not-allowed': 'Phone sign-in isn’t enabled yet. Please contact support.',
  'auth/billing-not-enabled': 'SMS sign-in isn’t available yet. Please contact support.',
};

export function authErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  if (code === 'auth/operation-not-allowed' && /region/i.test(message)) {
    return 'We can’t send codes to numbers in your country yet. Please try again later.';
  }
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}
