import { httpsCallable } from 'firebase/functions';

import { functions } from '@/lib/firebase';

export const REPORT_REASONS = [
  { value: 'inappropriate_messages', label: 'Inappropriate messages' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'underage', label: 'Appears underage' },
  { value: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

export type BlockedUser = {
  uid: string;
  firstName: string;
  photoUrl: string | null;
};

const unmatchFn = httpsCallable<{ matchId: string }, { ok: boolean }>(functions, 'unmatch');
const blockUserFn = httpsCallable<{ targetId: string; matchId?: string }, { ok: boolean }>(functions, 'blockUser');
const unblockUserFn = httpsCallable<{ targetId: string }, { ok: boolean }>(functions, 'unblockUser');
const reportUserFn = httpsCallable<
  { targetId: string; reason: ReportReason; details?: string; matchId?: string; messageId?: string },
  { ok: boolean; reportId: string }
>(functions, 'reportUser');
const listBlockedUsersFn = httpsCallable<Record<string, never>, { users: BlockedUser[] }>(
  functions,
  'listBlockedUsers',
);

export const unmatch = (matchId: string) => unmatchFn({ matchId });
export const blockUser = (targetId: string, matchId?: string) =>
  blockUserFn(matchId ? { targetId, matchId } : { targetId });
export const unblockUser = (targetId: string) => unblockUserFn({ targetId });
export const reportUser = (input: {
  targetId: string;
  reason: ReportReason;
  details?: string;
  matchId?: string;
  messageId?: string;
}) => reportUserFn(input);
export const listBlockedUsers = async () => (await listBlockedUsersFn({})).data.users;
