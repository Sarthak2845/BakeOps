import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { Colors, MaxContentWidth, Radii, Spacing, themedStyles } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

export interface MonthDay {
  month: number; // 1-12
  day: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Days per month in a leap year, so 29 Feb can be picked.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function formatMonthDay(value: MonthDay): string {
  return `${value.day} ${MONTHS[value.month - 1]}`;
}

/** Picks a yearly date (day + month, no year) for birthdays and anniversaries. */
export function OccasionDatePicker({
  value,
  onChange,
  error,
  placeholder = 'Pick a date',
}: {
  value: MonthDay | null;
  onChange: (value: MonthDay | null) => void;
  error?: string | null;
  placeholder?: string;
}) {
  useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState<number | null>(null);

  function openSheet() {
    const now = new Date();
    setMonth(value?.month ?? now.getMonth() + 1);
    setDay(value?.day ?? null);
    setOpen(true);
  }

  const days = DAYS_IN_MONTH[month - 1];
  const selectedDay = day !== null && day <= days ? day : null;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={openSheet}
        style={[styles.field, error ? styles.fieldError : null]}
        accessibilityRole="button"
        accessibilityLabel={value ? `Date ${formatMonthDay(value)}. Change` : placeholder}>
        <Ionicons name="gift-outline" size={18} color={value ? Colors.brand : Colors.textMuted} />
        <AppText variant="bodyMedium" color={value ? Colors.text : Colors.textMuted} style={styles.flex}>
          {value ? formatMonthDay(value) : placeholder}
        </AppText>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityLabel="Clear date">
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
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
          <AppText variant="h2">Which day each year?</AppText>

          <View style={styles.grid}>
            {MONTHS.map((m, i) => {
              const active = month === i + 1;
              return (
                <Pressable key={m} onPress={() => setMonth(i + 1)} style={styles.monthCell}>
                  <View style={[styles.monthChip, active && styles.chipActive]}>
                    <AppText variant="bodyBold" color={active ? Colors.white : Colors.text}>
                      {m}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.grid}>
            {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
              const active = selectedDay === d;
              return (
                <Pressable key={d} onPress={() => setDay(d)} style={styles.dayCell} accessibilityLabel={`${d} ${MONTHS[month - 1]}`}>
                  <View style={[styles.day, active && styles.chipActive]}>
                    <AppText variant={active ? 'bodyBold' : 'body'} color={active ? Colors.white : Colors.text}>
                      {d}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Button
            label={selectedDay ? `Save ${formatMonthDay({ month, day: selectedDay })}` : 'Pick a day'}
            disabled={!selectedDay}
            onPress={() => {
              if (!selectedDay) return;
              onChange({ month, day: selectedDay });
              setOpen(false);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    gap: Spacing.one + 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.backgroundMuted,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: '25%',
    padding: 3,
  },
  monthChip: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  dayCell: {
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
}));
