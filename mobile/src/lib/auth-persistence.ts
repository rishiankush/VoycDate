import { getReactNativePersistence } from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Persistence } from 'firebase/auth';

export const authPersistence: Persistence | null = getReactNativePersistence(AsyncStorage);
