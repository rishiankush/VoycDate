import { httpsCallable } from 'firebase/functions';

import { functions } from '@/lib/firebase';
import { uploadFile } from '@/lib/upload';

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type ProfileVerification = {
  status?: VerificationStatus;
  requestId?: string;
  rejectionReason?: string | null;
};

type Challenge = {
  challengeId: string;
  code: string;
  action: string;
  expiresAtMs: number;
};

const prepareFn = httpsCallable<Record<string, never>, Challenge>(functions, 'prepareVerification');
const submitFn = httpsCallable<{ challengeId: string; path: string; durationMs: number }, { ok: boolean }>(
  functions,
  'submitVerification',
);

export const prepareVerification = async () => (await prepareFn({})).data;

export async function submitVerificationVideo(
  uid: string,
  challengeId: string,
  recording: { uri: string; durationMs: number },
  onProgress?: (fraction: number) => void,
) {
  const path = `verifications/${uid}/${challengeId}.mp4`;
  await uploadFile(recording.uri, path, 'video/mp4', { onProgress });
  await submitFn({ challengeId, path, durationMs: recording.durationMs });
  return { path };
}
