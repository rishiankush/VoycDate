import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { useSession } from '@/features/auth/SessionProvider';
import { registerPushToken } from '@/features/notifications/pushToken';

/**
 * Location and notification prompts live in onboarding. Returning users (reinstall + same
 * phone number) skip those screens, so ask once on first active-session launch when the OS
 * still considers either permission undetermined.
 */
export function useStartupPermissions(enabled: boolean) {
  const asked = useRef(false);
  const { user } = useSession();

  useEffect(() => {
    if (!enabled || asked.current) return;
    asked.current = true;

    void (async () => {
      try {
        const location = await Location.getForegroundPermissionsAsync();
        if (location.status === Location.PermissionStatus.UNDETERMINED) {
          await Location.requestForegroundPermissionsAsync();
        }
      } catch {
        // Emulators / restricted environments may not support the prompt.
      }

      try {
        const notifications = await Notifications.getPermissionsAsync();
        if (notifications.status === Notifications.PermissionStatus.UNDETERMINED) {
          await Notifications.requestPermissionsAsync();
        }
        if (user?.uid) await registerPushToken(user.uid);
      } catch {
        // Same as above — never block the app on permission APIs.
      }
    })();
  }, [enabled, user?.uid]);
}
