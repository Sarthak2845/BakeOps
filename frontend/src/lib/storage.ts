import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser, Business } from './types';

const SESSION_KEY = 'bakeops.session';

export interface StoredSession {
  token: string;
  user: AuthUser;
  business: Business;
}

export async function getStoredSession(): Promise<StoredSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function setStoredSession(session: StoredSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
