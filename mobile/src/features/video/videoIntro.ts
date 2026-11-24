import { serverTimestamp, updateDoc } from 'firebase/firestore';

import { profileDoc } from '@/features/onboarding/OnboardingProvider';
import type { VideoIntro } from '@/features/onboarding/types';
import { deleteFile, uploadFile } from '@/lib/upload';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Uploads a recorded intro and submits it for the automatic face and content check. The whole field is
 * replaced (not merged) so no approval details from a previous video carry over.
 */
export async function submitVideoIntro(
  uid: string,
  recording: { uri: string; durationMs: number },
  previous: VideoIntro | null | undefined,
  onProgress?: (fraction: number) => void,
) {
  const isMov = /\.mov$/i.test(recording.uri);
  const path = `profiles/${uid}/video/${newId()}.${isMov ? 'mov' : 'mp4'}`;
  const { url } = await uploadFile(recording.uri, path, isMov ? 'video/quicktime' : 'video/mp4', { onProgress });

  const videoIntro: VideoIntro = {
    path,
    url,
    durationMs: Math.round(recording.durationMs),
    status: 'pending',
    checkNonce: Date.now(),
  };
  await updateDoc(profileDoc(uid), { videoIntro, updatedAt: serverTimestamp() });

  if (previous?.path && previous.path !== path) deleteFile(previous.path);
  if (previous?.posterPath) deleteFile(previous.posterPath);
}

/** Re-submits the same video for checking after a temporary check failure or a stuck pending state. */
export function retryVideoCheck(uid: string, video: VideoIntro) {
  const videoIntro: VideoIntro = {
    path: video.path,
    url: video.url,
    durationMs: video.durationMs,
    status: 'pending',
    // Forces the moderation trigger to run even when the file path is unchanged.
    checkNonce: Date.now(),
  };
  return updateDoc(profileDoc(uid), { videoIntro, updatedAt: serverTimestamp() });
}
