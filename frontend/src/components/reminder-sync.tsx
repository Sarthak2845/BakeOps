import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import {
  cancelReminders,
  getNotificationPermission,
  remindersSupported,
  requestNotificationPermission,
  scheduleReminders,
  useReminderSettings,
} from '@/lib/notifications';
import { useCustomers, useOrders } from '@/lib/queries';
import { planReminders } from '@/lib/reminders';

/**
 * Keeps the phone's scheduled reminders in step with the shop's orders and
 * customers (issue #37): re-planned whenever the data or settings change, and
 * whenever the app comes back to the foreground (a new day may have started).
 * Renders nothing. Mounted once, in the tabs layout.
 */
export function ReminderSync() {
  if (!remindersSupported) return null;
  return (
    <>
      <Scheduler />
      <TapHandler />
    </>
  );
}

function Scheduler() {
  const { ready, settings, asked } = useReminderSettings();
  // Same queries (and cache) as Home, so any order change re-plans reminders.
  const orders = useOrders();
  const customers = useCustomers();
  const [foregroundTick, setForegroundTick] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setForegroundTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!settings.enabled) {
      void cancelReminders();
      return;
    }
    if (!orders.data || !customers.data) return;

    let cancelled = false;
    // Wait a moment: several queries often settle together.
    const timer = setTimeout(async () => {
      try {
        let permission = await getNotificationPermission();
        // Ask once, automatically. After that only from Profile → Reminders.
        if (permission === 'ask' && !asked) permission = await requestNotificationPermission();
        if (cancelled || permission !== 'granted') return;
        await scheduleReminders(planReminders(orders.data, customers.data, settings, new Date()));
      } catch (err) {
        console.warn('Could not schedule reminders', err);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, settings, asked, orders.data, customers.data, foregroundTick]);

  return null;
}

/** Tapping a reminder opens the order (or screen) it is about. */
function TapHandler() {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const url = response.notification.request.content.data?.url;
    // Handle each tap once, even if this component remounts.
    Notifications.clearLastNotificationResponse();
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
  }, [response]);

  return null;
}
