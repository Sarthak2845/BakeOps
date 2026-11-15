import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { Colors, MaxContentWidth, Radii, Spacing, themedStyles } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

export interface Delivery {
  /** Local calendar day, at midnight. */
  date: Date;
  /** Hour of day (24h), or null for "any time". */
  hour: number | null;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
// The backend rejects delivery dates after 2100.
const MAX_YEAR = 2100;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'am' : 'pm'}`;
}

/** The moment sent to the API: the chosen hour, or midnight for "any time". */
export function deliveryToDate(delivery: Delivery): Date {
  const d = new Date(delivery.date);
  d.setHours(delivery.hour ?? 0, 0, 0, 0);
  return d;
}

function describe(delivery: Delivery, today: Date): string {
  const { date } = delivery;
  const day = sameDay(date, today)
    ? 'Today'
    : sameDay(date, addDays(today, 1))
      ? 'Tomorrow'
      : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const withYear = date.getFullYear() !== today.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${day}${withYear} · ${delivery.hour === null ? 'Any time' : hourLabel(delivery.hour)}`;
}

/** Month grid cells; null pads the days before the 1st. */
function monthCells(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DeliveryPicker({
  value,
  onChange,
  error,
}: {
  value: Delivery | null;
  onChange: (value: Delivery | null) => void;
  error?: string | null;
}) {
  useTheme();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(today);
  const [draftHour, setDraftHour] = useState<number | null>(null);
  const [month, setMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));

  function openSheet() {
    const start = value?.date ?? today;
    setDraftDate(start);
    setDraftHour(value?.hour ?? null);
    setMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setOpen(true);
  }

  function pickDay(d: Date) {
    setDraftDate(d);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  // Hours already past today can't be picked.
  const nowHour = new Date().getHours();
  const hourDisabled = (h: number) => sameDay(draftDate, today) && h <= nowHour;
  const selectedHour = draftHour !== null && hourDisabled(draftHour) ? null : draftHour;

  const cells = monthCells(month);
  const canGoBack = month > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoForward = month.getFullYear() < MAX_YEAR || month.getMonth() < 11;
  const quickDays = [0, 1, 2].map((n) => addDays(today, n));

  return (
    <View style={styles.fieldWrap}>
      <Pressable
        onPress={openSheet}
        style={[styles.field, error ? styles.fieldError : null]}
        accessibilityRole="button"
        accessibilityLabel={value ? `Delivery ${describe(value, today)}. Change` : 'Pick a delivery date'}>
        <Ionicons name="calendar-outline" size={18} color={value ? Colors.brand : Colors.textMuted} />
        <AppText variant="bodyMedium" color={value ? Colors.text : Colors.textMuted} style={styles.flex}>
          {value ? describe(value, today) : 'Pick a delivery date'}
        </AppText>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityLabel="Clear delivery date">
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        )}
      </Pressable>
      {error ? (
        <AppText variant="small" color={Colors.dangerSoftText} style={styles.errorText}>
          {error}
        </AppText>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.handle} />
          <AppText variant="h2">Delivery</AppText>

          <View style={styles.quickRow}>
            {quickDays.map((d, i) => {
              const active = sameDay(d, draftDate);
              const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'long' });
              return (
                <Pressable key={label} onPress={() => pickDay(d)} style={[styles.chip, active && styles.chipActive]}>
                  <AppText variant="bodyBold" color={active ? Colors.white : Colors.text}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.monthRow}>
            <Pressable
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              disabled={!canGoBack}
              hitSlop={8}
              accessibilityLabel="Previous month">
              <Ionicons name="chevron-back" size={20} color={canGoBack ? Colors.text : Colors.outline} />
            </Pressable>
            <AppText variant="bodyBold">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</AppText>
            <Pressable
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              disabled={!canGoForward}
              hitSlop={8}
              accessibilityLabel="Next month">
              <Ionicons name="chevron-forward" size={20} color={canGoForward ? Colors.text : Colors.outline} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {WEEKDAYS.map((w, i) => (
              <View key={`w${i}`} style={styles.cell}>
                <AppText variant="small" color={Colors.textMuted}>
                  {w}
                </AppText>
              </View>
            ))}
            {cells.map((d, i) => {
              if (!d) return <View key={`e${i}`} style={styles.cell} />;
              const past = d < today;
              const selected = sameDay(d, draftDate);
              const isToday = sameDay(d, today);
              return (
                <Pressable
                  key={d.toISOString()}
                  style={styles.cell}
                  disabled={past}
                  onPress={() => pickDay(d)}
                  accessibilityLabel={d.toDateString()}
                  accessibilityState={{ selected, disabled: past }}>
                  <View style={[styles.day, isToday && styles.dayToday, selected && styles.daySelected]}>
                    <AppText
                      variant={selected || isToday ? 'bodyBold' : 'body'}
                      color={selected ? Colors.white : past ? Colors.outline : Colors.text}>
                      {d.getDate()}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <AppText variant="bodyMedium">Time</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
            <Pressable onPress={() => setDraftHour(null)} style={[styles.chip, selectedHour === null && styles.chipActive]}>
              <AppText variant="bodyBold" color={selectedHour === null ? Colors.white : Colors.text}>
                Any time
              </AppText>
            </Pressable>
            {SLOT_HOURS.map((h) => {
              const disabled = hourDisabled(h);
              const active = selectedHour === h;
              return (
                <Pressable
                  key={h}
                  disabled={disabled}
                  onPress={() => setDraftHour(h)}
                  style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}>
                  <AppText variant="bodyBold" color={active ? Colors.white : disabled ? Colors.outline : Colors.text}>
                    {hourLabel(h)}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          <Button
            label={`Deliver ${describe({ date: draftDate, hour: selectedHour }, today)}`}
            onPress={() => {
              onChange({ date: draftDate, hour: selectedHour });
              setOpen(false);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = themedStyles(() => ({
  fieldWrap: {
    gap: Spacing.one + 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.card,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.two + 6,
    paddingHorizontal: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fieldError: {
    borderColor: Colors.danger,
  },
  errorText: {
    paddingHorizontal: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 17, 35, 0.4)',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outline,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two - 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: Colors.brand,
  },
  daySelected: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  timeRow: {
    gap: Spacing.two,
  },
}));
