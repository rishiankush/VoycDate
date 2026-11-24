import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

import { authPersistence } from './auth-persistence';

export const FUNCTIONS_REGION = 'us-central1';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const usingEmulators = __DEV__ && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

/** Runs only Cloud Functions locally (against the live database) while the rest stays live. */
const localFunctions = __DEV__ && process.env.EXPO_PUBLIC_USE_LOCAL_FUNCTIONS === 'true';

// Android emulators reach the host machine through 10.0.2.2; physical phones need the
// computer's LAN IP via EXPO_PUBLIC_FIREBASE_EMULATOR_HOST.
const emulatorHost =
  process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ??
  (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');

const isFirstInit = getApps().length === 0;

export const firebaseApp = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// initializeAuth may only run once per app; Fast Refresh re-evaluates this module.
export const auth: Auth =
  isFirstInit && authPersistence
    ? initializeAuth(firebaseApp, { persistence: authPersistence })
    : getAuth(firebaseApp);

export const db = getFirestore(firebaseApp);
export const functions = getFunctions(firebaseApp, FUNCTIONS_REGION);
export const storage = getStorage(firebaseApp);

if (usingEmulators && isFirstInit) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
  connectFunctionsEmulator(functions, emulatorHost, 5001);
  connectStorageEmulator(storage, emulatorHost, 9199);
} else if (localFunctions && isFirstInit) {
  connectFunctionsEmulator(functions, emulatorHost, 5001);
}
