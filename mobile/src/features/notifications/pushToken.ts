import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { deleteField, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { userDoc } from '@/features/auth/userRecord';

function easProjectId() {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    null
  );
}

export async function ensureNotificationPermissions() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return current;
  if (current.status === Notifications.PermissionStatus.DENIED) return current;
  return Notifications.requestPermissionsAsync();
}

/** Registers this device for push and stores the token on `users/{uid}`. */
export async function registerPushToken(uid: string) {
  if (!Device.isDevice) return null;

  const permission = await ensureNotificationPermissions();
  if (!permission.granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('voyc-default', {
      name: 'VOYC',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#471448',
    });
  }

  const projectId = easProjectId();
  let token: string | null = null;
  try {
    if (projectId) {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } else {
      token = (await Notifications.getDevicePushTokenAsync()).data as string;
    }
  } catch {
    try {
      token = (await Notifications.getDevicePushTokenAsync()).data as string;
    } catch {
      return null;
    }
  }
  if (!token) return null;

  await setDoc(
    userDoc(uid),
    {
      expoPushTokens: {
        [token]: {
          platform: Platform.OS,
          updatedAt: serverTimestamp(),
        },
      },
      notificationsPermission: 'granted',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return token;
}

export async function clearPushToken(uid: string, token: string | null) {
  if (!token) return;
  try {
    await updateDoc(userDoc(uid), {
      [`expoPushTokens.${token}`]: deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Signing out should still succeed if the token doc is already gone.
  }
}
