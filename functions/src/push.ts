import { FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';

import { db } from './shared';

export type NotificationKind =
  | 'newMatch'
  | 'voiceMessage'
  | 'textPhoto'
  | 'unlock'
  | 'expiry'
  | 'verification';

export type PushPayload = {
  title: string;
  body: string;
  data: Record<string, string>;
  kind: NotificationKind;
};

type NotificationSettings = Partial<Record<NotificationKind, boolean>>;

const DEFAULT_SETTINGS: Record<NotificationKind, boolean> = {
  newMatch: true,
  voiceMessage: true,
  textPhoto: true,
  unlock: true,
  expiry: true,
  verification: true,
};

function settingsOf(user: FirebaseFirestore.DocumentData | undefined, prefs: FirebaseFirestore.DocumentData | undefined) {
  const fromPrefs = (prefs?.notifications ?? {}) as NotificationSettings;
  const fromUser = (user?.notificationSettings ?? {}) as NotificationSettings;
  return { ...DEFAULT_SETTINGS, ...fromUser, ...fromPrefs };
}

function tokenEntries(user: FirebaseFirestore.DocumentData | undefined) {
  const map = (user?.expoPushTokens ?? {}) as Record<string, unknown>;
  return Object.keys(map).filter(Boolean);
}

function isExpoToken(token: string) {
  return token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken');
}

async function sendExpo(tokens: string[], payload: PushPayload) {
  if (!tokens.length) return [];
  const messages = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: 'default' as const,
    channelId: 'voyc-default',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Expo push failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
  return json.data ?? [];
}

async function sendFcm(tokens: string[], payload: PushPayload) {
  if (!tokens.length) return;
  await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
    android: { priority: 'high', notification: { channelId: 'voyc-default' } },
    apns: { payload: { aps: { sound: 'default' } } },
  });
}

/** Writes an in-app inbox row and delivers a push to the user's registered devices. */
export async function notifyUser(uid: string, payload: PushPayload) {
  const firestore = db();
  const [userSnap, prefsSnap] = await firestore.getAll(firestore.doc(`users/${uid}`), firestore.doc(`preferences/${uid}`));
  const user = userSnap.data();
  const prefs = prefsSnap.data();
  if (!user || user.status !== 'active') return;

  const settings = settingsOf(user, prefs);
  if (settings[payload.kind] === false) return;

  const inboxRef = firestore.collection(`users/${uid}/inbox`).doc();
  await inboxRef.set({
    kind: payload.kind,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  const tokens = tokenEntries(user);
  if (!tokens.length) return;

  const expoTokens = tokens.filter(isExpoToken);
  const fcmTokens = tokens.filter((t) => !isExpoToken(t));

  try {
    if (expoTokens.length) await sendExpo(expoTokens, payload);
  } catch (error) {
    logger.warn('Expo push send failed', { uid, error });
  }
  try {
    if (fcmTokens.length) await sendFcm(fcmTokens, payload);
  } catch (error) {
    logger.warn('FCM push send failed', { uid, error });
  }
}

export async function notifyUsers(uids: string[], payload: PushPayload) {
  await Promise.all(uids.map((uid) => notifyUser(uid, payload).catch((error) => logger.warn('notifyUser failed', { uid, error }))));
}

export function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
