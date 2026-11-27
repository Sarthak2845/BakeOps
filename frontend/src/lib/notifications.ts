// Reminder notifications, scheduled on the phone itself (issue #37): no push
// server, so they work offline and while the free backend sleeps. The plan comes
// from src/lib/reminders.ts; this file owns permission, the Android channel,
// scheduling and the saved settings. Everything is a no-op on the web.

import { useSyncExternalStore } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { DEFAULT_REMINDER_SETTINGS, type PlannedReminder, type ReminderSettings } from './reminders';

export const remindersSupported = Platform.OS !== 'web';

const CHANNEL_ID = 'reminders';
const SETTINGS_KEY = 'bakeops.reminders';

// ---------- settings (shared store, saved on the device) ----------

interface SettingsState {
  ready: boolean;
  settings: ReminderSettings;
  /** Whether the app has already shown the system permission prompt once. */
  asked: boolean;
}

let state: SettingsState = { ready: false, settings: DEFAULT_REMINDER_SETTINGS, asked: false };
const listeners = new Set<() => void>();

function setState(next: Partial<SettingsState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  if (state.ready) {
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ settings: state.settings, asked: state.asked })).catch(
      () => undefined
    );
  }
}

AsyncStorage.getItem(SETTINGS_KEY)
  .then((raw) => {
    const saved = raw ? (JSON.parse(raw) as Partial<{ settings: Partial<ReminderSettings>; asked: boolean }>) : {};
    state = {
      ready: true,
      settings: { ...DEFAULT_REMINDER_SETTINGS, ...saved.settings },
      asked: !!saved.asked,
    };
    listeners.forEach((l) => l());
  })
  .catch(() => {
    state = { ...state, ready: true };
    listeners.forEach((l) => l());
  });

export function updateReminderSettings(patch: Partial<ReminderSettings>) {
  setState({ settings: { ...state.settings, ...patch } });
}

function markAsked() {
  if (!state.asked) setState({ asked: true });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReminderSettings(): SettingsState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}

// ---------- setup and permission ----------

let initialized: Promise<void> | null = null;

/** Show reminders while the app is open too, and create the Android channel. */
export function initNotifications(): Promise<void> {
  if (!remindersSupported) return Promise.resolve();
  initialized ??= (async () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    // On Android 13+ the permission prompt only appears once a channel exists.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Order reminders',
        description: 'Deliveries, prep, payments to collect and customer occasions',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#7C3AED',
      });
    }
  })().catch(() => {
    initialized = null;
  });
  return initialized;
}

/** granted · ask (the app may show the prompt) · blocked (only phone settings can allow it) · unsupported */
export type NotificationPermission = 'granted' | 'ask' | 'blocked' | 'unsupported';

function toPermission(p: Notifications.NotificationPermissionsStatus): NotificationPermission {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'ask' : 'blocked';
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!remindersSupported) return 'unsupported';
  try {
    return toPermission(await Notifications.getPermissionsAsync());
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!remindersSupported) return 'unsupported';
  await initNotifications();
  markAsked();
  try {
    return toPermission(await Notifications.requestPermissionsAsync());
  } catch {
    return 'unsupported';
  }
}

export function openNotificationSettings() {
  void Linking.openSettings();
}

// ---------- scheduling ----------

let lastSignature: string | null = null;

/** Replace every scheduled reminder with `plan`. Skips the work when nothing changed. */
export async function scheduleReminders(plan: PlannedReminder[]): Promise<void> {
  if (!remindersSupported) return;
  const signature = JSON.stringify(plan.map((r) => [r.id, r.date.getTime(), r.title, r.body, r.url]));
  if (signature === lastSignature) return;

  await initNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { url: r.url } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL_ID },
    });
  }
  lastSignature = signature;
}

/** Cancel everything (reminders turned off, or logging out). */
export async function cancelReminders(): Promise<void> {
  lastSignature = null;
  if (!remindersSupported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing scheduled, or notifications unavailable: nothing to cancel.
  }
}

/** A sample reminder a few seconds from now, to check notifications work on this phone. */
export async function sendTestReminder(): Promise<void> {
  await initNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Reminders are on',
      body: "This is how BakeOps will remind you about deliveries and payments.",
      data: { url: '/profile' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
  });
}
