import { PhoneAuthProvider, signInWithCredential, type ApplicationVerifier } from 'firebase/auth';

import { auth } from '@/lib/firebase';

export const RESEND_COOLDOWN_SECONDS = 30;

type PendingVerification = {
  verificationId: string;
  phoneNumber: string;
  sentAt: number;
};

let pending: PendingVerification | null = null;

export function getPendingVerification() {
  return pending;
}

export async function sendVerificationCode(phoneNumber: string, verifier: ApplicationVerifier) {
  const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber(phoneNumber, verifier);
  pending = { verificationId, phoneNumber, sentAt: Date.now() };
  return pending;
}

export async function confirmVerificationCode(code: string) {
  if (!pending) throw new Error('No verification in progress');
  const credential = PhoneAuthProvider.credential(pending.verificationId, code);
  await signInWithCredential(auth, credential);
  pending = null;
}
