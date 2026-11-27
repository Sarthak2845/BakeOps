import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Radii, Spacing, themedStyles } from '@/constants/theme';
import {
  getNotificationPermission,
  type NotificationPermission,
  openNotificationSettings,
  remindersSupported,
  requestNotificationPermission,
  sendTestReminder,
  updateReminderSettings,
  useReminderSettings,
} from '@/lib/notifications';
import type { ReminderSettings } from '@/lib/reminders';
import { useTheme } from '@/lib/theme-context';

function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'am' : 'pm'}`;
}

type Choice = { value: number; label: string };
const MORNING: Choice[] = [6, 7, 8, 9].map((h) => ({ value: h, label: hourLabel(h) }));
const EVENING: Choice[] = [18, 19, 20, 21, 22].map((h) => ({ value: h, label: hourLabel(h) }));
const BEFORE: Choice[] = [1, 2, 3, 4].map((h) => ({ value: h, label: `${h} h` }));

/** Profile → Reminders: what the phone reminds about, and when (issue #37). */
export function ReminderSettingsCard() {
  useTheme();
  const toast = useToast();
  const { settings } = useReminderSettings();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  const refresh = useCallback(() => {
    void getNotificationPermission().then(setPermission);
  }, []);

  // Re-check when coming back from the phone's settings.
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const set = (patch: Partial<ReminderSettings>) => updateReminderSettings(patch);

  const allow = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'blocked') toast.error('Allow notifications for BakeOps in your phone settings.', 'Notifications are off');
  };

  const test = async () => {
    try {
      await sendTestReminder();
      toast.success('A test reminder will appear in 5 seconds');
    } catch {
      toast.error("Couldn't send a test reminder on this phone.");
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="notifications-outline" size={20} color={Colors.brand} />
        <View style={styles.flex}>
          <AppText variant="bodyBold">Reminders</AppText>
          <AppText variant="small" color={Colors.textMuted}>
            Deliveries, prep, payments to collect and customer occasions
          </AppText>
        </View>
        {remindersSupported ? (
          <Switch
            value={settings.enabled}
            onValueChange={(enabled) => set({ enabled })}
            trackColor={{ true: Colors.brand }}
            accessibilityLabel="Reminders"
          />
        ) : null}
      </View>

      {!remindersSupported ? (
        <AppText variant="small" color={Colors.textMuted}>
          Reminders work in the BakeOps Android app.
        </AppText>
      ) : !settings.enabled ? null : (
        <>
          {permission === 'blocked' ? (
            <View style={styles.notice}>
              <AppText variant="small" color={Colors.dangerSoftText}>
                Notifications are turned off for BakeOps, so reminders can't appear.
              </AppText>
              <Button label="Open phone settings" variant="outline" onPress={openNotificationSettings} />
            </View>
          ) : permission === 'ask' ? (
            <View style={styles.notice}>
              <AppText variant="small" color={Colors.textMuted}>
                Allow notifications so BakeOps can remind you.
              </AppText>
              <Button label="Allow notifications" onPress={() => void allow()} />
            </View>
          ) : null}

          <Row
            title="Morning brief"
            hint="Today's deliveries, on days you have any"
            value={settings.morning}
            onChange={(morning) => set({ morning })}>
            <Chips choices={MORNING} value={settings.morningHour} onChange={(morningHour) => set({ morningHour })} />
          </Row>

          <Row
            title="Tomorrow's prep"
            hint="The evening before: what to bake for tomorrow"
            value={settings.evening}
            onChange={(evening) => set({ evening })}>
            <Chips choices={EVENING} value={settings.eveningHour} onChange={(eveningHour) => set({ eveningHour })} />
          </Row>

          <Row
            title="Before a delivery"
            hint="For deliveries with a set time"
            value={settings.beforeDelivery}
            onChange={(beforeDelivery) => set({ beforeDelivery })}>
            <Chips choices={BEFORE} value={settings.hoursBefore} onChange={(hoursBefore) => set({ hoursBefore })} />
          </Row>

          <Row
            title="Payments to collect"
            hint="1 and 7 days after delivery, and every Monday"
            value={settings.payments}
            onChange={(payments) => set({ payments })}
          />

          <Row
            title="Customer occasions"
            hint="A week before a saved birthday or anniversary"
            value={settings.occasions}
            onChange={(occasions) => set({ occasions })}
          />

          {permission === 'granted' ? <Button label="Send a test reminder" variant="ghost" onPress={() => void test()} /> : null}
        </>
      )}
    </Card>
  );
}

function Row({
  title,
  hint,
  value,
  onChange,
  children,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.flex}>
          <AppText variant="bodyBold">{title}</AppText>
          <AppText variant="small" color={Colors.textMuted}>
            {hint}
          </AppText>
        </View>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: Colors.brand }} accessibilityLabel={title} />
      </View>
      {value ? children : null}
    </View>
  );
}

function Chips({ choices, value, onChange }: { choices: Choice[]; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {choices.map((c) => {
        const active = c.value === value;
        return (
          <Pressable
            key={c.value}
            onPress={() => onChange(c.value)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}>
            <AppText variant="small" color={active ? Colors.white : Colors.text}>
              {c.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  notice: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radii.md,
    backgroundColor: Colors.backgroundMuted,
  },
  row: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    backgroundColor: Colors.backgroundMuted,
  },
  chipActive: {
    backgroundColor: Colors.brand,
  },
}));
