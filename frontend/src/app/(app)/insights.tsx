import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { AppText } from '@/components/ui/text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { monthRange, ordersInRange, repeatRate, sumTotals, topFlavours } from '@/lib/business-logic';
import { exportOrdersCsv } from '@/lib/export';
import { formatMoney } from '@/lib/format';
import { useOrders } from '@/lib/queries';

export default function InsightsScreen() {
  const { data: orders = [] } = useOrders();
  const [exporting, setExporting] = useState(false);
  const today = useMemo(() => new Date(), []);

  const stats = useMemo(() => {
    const { start, end } = monthRange(today);
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prev = monthRange(prevMonthDate);

    const monthOrders = ordersInRange(orders, start, end);
    const prevOrders = ordersInRange(orders, prev.start, prev.end);

    const revenue = sumTotals(monthOrders);
    const prevRevenue = sumTotals(prevOrders);
    const growth = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;

    const avgOrder = monthOrders.length > 0 ? revenue / monthOrders.length : 0;
    const weekendCount = monthOrders.filter((o) => {
      if (!o.deliveryDate) return false;
      const day = new Date(o.deliveryDate).getDay();
      return day === 0 || day === 6;
    }).length;

    const weeks: number[] = [0, 0, 0, 0, 0];
    for (const o of monthOrders) {
      const weekIndex = Math.min(4, Math.floor((new Date(o.orderDate).getDate() - 1) / 7));
      weeks[weekIndex] += 1;
    }

    return {
      monthOrders,
      revenue,
      growth,
      avgOrder,
      repeat: repeatRate(orders),
      weekendCount,
      weeks,
      flavours: topFlavours(monthOrders),
    };
  }, [orders, today]);

  const maxWeek = Math.max(1, ...stats.weeks);
  const maxFlavourRevenue = Math.max(1, ...stats.flavours.map((f) => f.revenue));

  async function onExport() {
    setExporting(true);
    try {
      const label = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).replace(' ', '-');
      await exportOrdersCsv(stats.monthOrders, `bakeops-orders-${label}.csv`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </Pressable>
        <View>
          <AppText variant="eyebrow">{today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase()}</AppText>
          <AppText variant="h1">Your month</AppText>
        </View>
      </View>

      <View style={styles.revenueRow}>
        <View>
          <AppText variant="h1">{formatMoney(stats.revenue)}</AppText>
          {stats.growth !== null ? (
            <AppText variant="bodyBold" color={Colors.success}>
              {stats.growth >= 0 ? '↑' : '↓'} {Math.abs(stats.growth)}% from last month
            </AppText>
          ) : null}
        </View>
        <View style={styles.barsRow}>
          {stats.weeks.map((count, i) => (
            <View key={i} style={[styles.bar, { height: 8 + (count / maxWeek) * 40 }]} />
          ))}
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatTile value={String(stats.monthOrders.length)} label="orders" />
        <StatTile value={formatMoney(stats.avgOrder)} label="avg order" />
        <StatTile value={`${stats.repeat}%`} label="repeat" />
      </View>

      <Card tone="successSoft">
        <View style={styles.summaryHeader}>
          <Ionicons name="sunny-outline" size={16} color={Colors.successSoftText} />
          <AppText variant="eyebrow" color={Colors.successSoftText}>
            Weekly summary
          </AppText>
        </View>
        <AppText variant="body" color={Colors.successSoftText}>
          You made {formatMoney(stats.revenue)} from {stats.monthOrders.length} order{stats.monthOrders.length === 1 ? '' : 's'} this month.
          {stats.flavours[0] ? ` ${stats.flavours[0].description} was your best seller — ${stats.flavours[0].count} of them.` : ''}
          {stats.monthOrders.length > 0
            ? ` ${stats.weekendCount} of ${stats.monthOrders.length} deliveries fell on a weekend.`
            : ''}
        </AppText>
      </Card>

      <AppText variant="h2">Top flavours</AppText>
      <View style={{ gap: Spacing.two }}>
        {stats.flavours.length === 0 ? (
          <AppText variant="body" color={Colors.textMuted}>
            No orders yet this month.
          </AppText>
        ) : (
          stats.flavours.map((f) => (
            <View key={f.description}>
              <View style={styles.flavourRow}>
                <AppText variant="body">{f.description}</AppText>
                <AppText variant="small" color={Colors.textMuted}>
                  {f.count} · {formatMoney(f.revenue)}
                </AppText>
              </View>
              <View style={styles.flavourTrack}>
                <View style={[styles.flavourFill, { width: `${(f.revenue / maxFlavourRevenue) * 100}%` }]} />
              </View>
            </View>
          ))
        )}
      </View>

      <Pressable onPress={onExport} style={styles.exportRow} disabled={exporting}>
        <AppText variant="bodyBold" color={Colors.brand}>
          {exporting ? 'Preparing export…' : 'Export this month to CSV'}
        </AppText>
        <Ionicons name="arrow-forward" size={16} color={Colors.brand} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 48,
  },
  bar: {
    width: 10,
    borderRadius: 4,
    backgroundColor: Colors.accentSoft,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  flavourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  flavourTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.backgroundMuted,
    overflow: 'hidden',
  },
  flavourFill: {
    height: '100%',
    backgroundColor: Colors.accentSoft,
    borderRadius: 3,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
});
