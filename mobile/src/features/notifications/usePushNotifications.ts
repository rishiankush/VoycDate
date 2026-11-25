import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useSession } from '@/features/auth/SessionProvider';

import { registerPushToken } from './pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function openFromData(data: Record<string, unknown> | undefined) {
  if (!data) return;
  const matchId = typeof data.matchId === 'string' ? data.matchId : null;
  if (!matchId) return;
  router.push({ pathname: '/chat/[matchId]', params: { matchId } });
}

/** Registers the device token and routes notification taps into chat. */
export function usePushNotifications(enabled: boolean) {
  const { user, status } = useSession();
  const uid = user?.uid;
  const openedColdStart = useRef(false);

  useEffect(() => {
    if (!enabled || !uid || status !== 'active') return;

    void registerPushToken(uid);

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromData(response.notification.request.content.data as Record<string, unknown>);
    });

    if (!openedColdStart.current) {
      openedColdStart.current = true;
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) openFromData(response.notification.request.content.data as Record<string, unknown>);
        })
        .catch(() => {
          // Expo Go / Android can reject notification APIs; ignore.
        });
    }

    return () => sub.remove();
  }, [enabled, uid, status]);
}
