import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether this device has seen the first-launch onboarding. Read once at
// startup (the splash screen waits for it) and shared by the auth layout and
// the onboarding screen.
const KEY = 'bakeops.onboarded';

let state = { ready: false, done: false };
const listeners = new Set<() => void>();

function set(next: Partial<typeof state>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

AsyncStorage.getItem(KEY)
  .then((v) => set({ ready: true, done: v === '1' }))
  .catch(() => set({ ready: true, done: false }));

export function completeOnboarding() {
  if (state.done) return;
  set({ done: true });
  AsyncStorage.setItem(KEY, '1').catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOnboarding() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}
