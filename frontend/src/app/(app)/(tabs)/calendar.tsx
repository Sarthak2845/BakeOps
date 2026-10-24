import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FormError } from '@/components/ui/form-error';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { formatTime } from '@/lib/format';
import { useCustomers, useOrders } from '@/lib/queries';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function buildGrid(monthDate: Date): (Date | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

export default function CalendarScreen() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  const ordersQuery = useOrders();
  const customersQuery = useCustomers();
  const orders = ordersQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const loadError = ordersQuery.error ?? customersQuery.error;

  const cells = useMemo(() => buildGrid(monthDate), [monthDate]);

  const deliveryDays = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      if (o.deliveryDate && o.status !== 'CANCELLED') set.add(new Date(o.deliveryDate).toDateString());
    }
    return set;
  }, [orders]);

  const occasionDays = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      for (const occ of c.occasions ?? []) {
        const d = new Date(monthDate.getFullYear(), occ.month - 1, occ.day);
        set.add(d.toDateString());
      }
    }
    return set;
  }, [customers, monthDate]);

  const selectedOrders = useMemo(
    () =>
      orders
        .filter((o) => o.deliveryDate && o.status !== 'CANCELLED' && new Date(o.deliveryDate).toDateString() === selected.toDateString())
        .sort((a, b) => new Date(a.deliveryDate!).getTime() - new Date(b.deliveryDate!).getTime()),
    [orders, selected]
  );

  const totalKg = selectedOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + parseFloat(i.quantity), 0), 0);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">Deliveries</AppText>
        <View style={styles.monthRow}>
          <AppText variant="h1">{monthDate.toLocaleDateString('en-IN', { month: 'long' })}</AppText>
          <View style={styles.monthNav}>
            <Pressable onPress={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}>
              <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <AppText key={i} variant="small" color={Colors.textMuted} style={styles.weekCell}>
            {d}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={styles.dayCell} />;
          const isSelected = date.toDateString() === selected.toDateString();
          const hasDelivery = deliveryDays.has(date.toDateString());
          const hasOccasion = occasionDays.has(date.toDateString());
          return (
            <Pressable key={i} onPress={() => setSelected(date)} style={styles.dayCell}>
              <View style={[styles.dayInner, isSelected && styles.dayInnerSelected]}>
                <AppText variant="body" color={isSelected ? Colors.white : Colors.text}>
                  {date.getDate()}
                </AppText>
                <View style={styles.dotsRow}>
                  {hasDelivery ? <View style={[styles.dot, { backgroundColor: isSelected ? Colors.white : Colors.accentSoft }]} /> : null}
                  {hasOccasion ? <View style={[styles.dot, { backgroundColor: isSelected ? Colors.white : Colors.success }]} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Colors.accentSoft }]} />
          <AppText variant="small" color={Colors.textMuted}>
            Delivery
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Colors.success }]} />
          <AppText variant="small" color={Colors.textMuted}>
            Occasion
          </AppText>
        </View>
      </View>

      <FormError
        message={loadError ? `Couldn’t load your deliveries. ${getErrorMessage(loadError)}` : null}
        onRetry={() => {
          if (ordersQuery.isError) void ordersQuery.refetch();
          if (customersQuery.isError) void customersQuery.refetch();
        }}
      />

      <Card style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <AppText variant="h2">{selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</AppText>
          {selectedOrders.length > 0 ? (
            <AppText variant="small" color={Colors.textMuted}>
              {selectedOrders.length} deliver{selectedOrders.length === 1 ? 'y' : 'ies'} · {totalKg} kg
            </AppText>
          ) : null}
        </View>

        {selectedOrders.length === 0 ? (
          <EmptyState title="No deliveries" hint="Nothing scheduled for this day." />
        ) : (
          <View style={{ gap: Spacing.two }}>
            {selectedOrders.map((order) => (
              <Pressable key={order.id} onPress={() => router.push(`/orders/${order.id}`)} style={styles.orderRow}>
                <View style={styles.timeCol}>
                  <AppText variant="small" color={Colors.brand}>
                    {formatTime(order.deliveryDate)}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold">
                    {order.items[0]?.description}
                    {order.items.length > 1 ? ` +${order.items.length - 1} more` : ''}
                  </AppText>
                  <AppText variant="small" color={Colors.textMuted}>
                    {order.customer.name}
                    {order.occasionTag ? ` · ${order.occasionTag}` : ''}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginTop: Spacing.two,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNav: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 3,
  },
  dayInner: {
    flex: 1,
    borderRadius: Radii.sm,
    backgroundColor: Colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayInnerSelected: {
    backgroundColor: Colors.brand,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    height: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailCard: {
    gap: Spacing.two,
  },
  detailHeader: {
    gap: 2,
  },
  orderRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radii.md,
    padding: Spacing.two + 2,
  },
  timeCol: {
    width: 48,
  },
});
