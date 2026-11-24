import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';

initializeApp({ storageBucket: 'voyc-date.firebasestorage.app' });

// us-central1 serves the nam5 Firestore database's triggers and matches the app's callable region.
setGlobalOptions({ region: 'us-central1', maxInstances: 10, memory: '256MiB', timeoutSeconds: 30 });

export const ping = onCall(() => ({ ok: true, time: new Date().toISOString() }));

export {
  getDiscoveryFeed,
  syncDiscoveryFromPreferences,
  syncDiscoveryFromProfile,
  syncDiscoveryFromUser,
} from './discovery';
export { expireMatches } from './expiry';
export {
  markMatchRead,
  sendPhotoMessage,
  sendTextMessage,
  sendVoiceMessage,
  submitUnlockDecision,
} from './messages';
export { swipe } from './swipe';
export { checkVideoIntro, moderateProfileMedia } from './moderation';
export { transcribeVoiceMessage } from './transcription';
export { unmatch, blockUser, unblockUser, reportUser, listBlockedUsers } from './safety';
export { requestDataExport, deleteAccount } from './account';
