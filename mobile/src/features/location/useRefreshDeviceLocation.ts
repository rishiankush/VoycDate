import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';

import { useMyProfile } from '@/features/profile/MyProfileProvider';

import { readDeviceLocation } from './deviceLocation';

/**
 * Keeps the saved Discover location in sync with the device/simulator GPS. Without this,
 * a one-time onboarding allow (often Apple's SF default in Simulator) stays forever.
 */
export function useRefreshDeviceLocation() {
  const { uid, profile, saveLocation } = useMyProfile();
  const ranForUid = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || ranForUid.current === uid) return;
    ranForUid.current = uid;

    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const next = await readDeviceLocation();
        const prev = profile.location;
        if (prev && prev.lat === next.lat && prev.lng === next.lng && prev.city === next.city) return;
        await saveLocation(next);
      } catch {
        // Permission/GPS failures shouldn't interrupt browsing.
      }
    })();
  }, [uid, profile.location, saveLocation]);
}
