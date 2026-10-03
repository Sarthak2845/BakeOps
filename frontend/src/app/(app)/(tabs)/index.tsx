import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill, type PillTone } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { AppText } from '@/components/ui/text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  getUpcomingOccasions,
  isActiveOrder,
  monthRange,
  ordersInRange,
  ordersOnDate,
  sumBalanceDue,
  sumTotals,
} from '@/lib/business-logic';
import { formatMoney, formatTime } from '@/lib/format';
import { openUrl, openWhatsApp } from '@/lib/links';
import { useCustomers, useOrders } from '@/lib/queries';
import type { OrderStatus } from '@/lib/types';

const STATUS_TONE: Record<OrderStatus, PillTone> = {
  INQUIRY: 'outline',
  CONFIRMED: 'peachSoft',
  IN_PROGRESS: 'accentSoft',
  READY: 'success',
  DELIVERED: 'neutral',
  CANCELLED: 'danger',
};

export default function HomeScreen() {
  const { user, business } = useAuth();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();

  const today = useMemo(() => new Date(), []);
  const upcoming = useMemo(() => getUpcomingOccasions(customers, orders, today), [customers, orders, today]);
  const todaysOrders = useMemo(
    () => ordersOnDate(orders, today).sort((a, b) => new Date(a.deliveryDate!).getTime() - new Date(b.deliveryDate!).getTime()),
    [orders, today]
  );

  const stats = useMemo(() => {
    const { start, end } = monthRange(today);
    const monthOrders = ordersInRange(orders, start, end);
    return {
      revenue: sumTotals(monthOrders),
      count: monthOrders.length,
      due: sumBalanceDue(orders.filter(isActiveOrder)),
    };
  }, [orders, today]);

  const [primary, ...rest] = upcoming;
  const currency = business?.currency ?? 'INR';

  return (
    <Screen>
      <View style={styles.headerBlock}>
        <AppText variant="eyebrow">
          {today.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' }).toUpperCase()}
        </AppText>
        <AppText variant="h1">Namaste, {user?.name?.split(' ')[0] ?? 'there'}</AppText>
      </View>

      <Card tone="brand" style={styles.callCard}>
        <View style={styles.callHeaderRow}>
          <Ionicons name="call" size={16} color={Colors.white} />
          <AppText variant="bodyBold" color={Colors.white} style={styles.callHeaderText}>
            CALL TODAY · {upcoming.length}
          </AppText>
        </View>

        {primary ? (
          <>
            <View style={styles.primaryCard}>
              <View style={styles.primaryTopRow}>
                <AppText variant="bodyBold">{primary.customer.name}</AppText>
                {primary.yearsRunning > 0 ? (
                  <Pill tone="peachSoft" size="sm" label={`${primary.yearsRunning} years running`} />
                ) : null}
              </View>
              <AppText variant="body" color={Colors.textMuted}>
                {primary.occasion.label} in {primary.daysUntil} day{primary.daysUntil === 1 ? '' : 's'}
              </AppText>

              {primary.lastOrderSummary ? (
                <>
                  <View style={styles.hairline} />
                  <AppText variant="small" color={Colors.textMuted}>
                    Last time: {primary.lastOrderSummary}
                  </AppText>
                </>
              ) : null}

              <View style={styles.actionRow}>
                <View style={styles.actionFlex}>
                  <Button
                    label="WhatsApp"
                    variant="success"
                    onPress={() =>
                      openWhatsApp(
                        primary.customer.phone,
                        `Hi ${primary.customer.name}! Just a reminder that ${primary.occasion.label.toLowerCase()} is coming up in ${primary.daysUntil} day${primary.daysUntil === 1 ? '' : 's'} — would you like to place an order? – ${business?.name ?? ''}`
                      )
                    }
                  />
                </View>
                <View style={styles.actionFlex}>
                  <Button label="Call" variant="outline" onPress={() => openUrl(`tel:${primary.customer.phone}`)} />
                </View>
              </View>
            </View>

            {rest.slice(0, 3).map((u) => (
              <View key={`${u.customer.id}-${u.occasion.id}`} style={styles.compactRow}>
                <AppText variant="bodyBold" color={Colors.white}>
                  {u.customer.name}
                </AppText>
                <AppText variant="small" color={Colors.textOnDark}>
                  {u.occasion.label} · in {u.daysUntil}d
                </AppText>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyCallCard}>
            <AppText variant="body" color={Colors.white}>
              Nothing to call about today. Add a birthday or anniversary from a customer to get reminders here.
            </AppText>
          </View>
        )}
      </Card>

      <View style={styles.sectionHeaderRow}>
        <AppText variant="h2">In the kitchen today</AppText>
        <AppText variant="body" color={Colors.brand}>
          {todaysOrders.length} order{todaysOrders.length === 1 ? '' : 's'}
        </AppText>
      </View>

      {todaysOrders.length === 0 ? (
        <Card>
          <AppText variant="body" color={Colors.textMuted}>
            No deliveries scheduled for today.
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: Spacing.two }}>
          {todaysOrders.map((order) => (
            <Pressable key={order.id} onPress={() => router.push(`/orders/${order.id}`)}>
              <Card style={styles.kitchenRow}>
                <View style={styles.timeBubble}>
                  <AppText variant="small" style={styles.timeBubbleText}>
                    {formatTime(order.deliveryDate)}
                  </AppText>
                </View>
                <View style={styles.kitchenInfo}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {order.items[0]?.description}
                    {order.items.length > 1 ? ` +${order.items.length - 1} more` : ''}
                  </AppText>
                  <AppText variant="small" color={Colors.textMuted}>
                    {order.customer.name}
                  </AppText>
                </View>
                <Pill tone={STATUS_TONE[order.status]} size="sm" label={statusLabel(order.status)} />
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.statsRow}>
        <StatTile value={formatMoney(stats.revenue, currency)} label="this month" />
        <StatTile value={String(stats.count)} label="orders" />
        <StatTile value={formatMoney(stats.due, currency)} label="due" />
      </View>
    </Screen>
  );
}

function statusLabel(status: OrderStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: 4,
    marginTop: Spacing.two,
  },
  callCard: {
    gap: Spacing.two,
  },
  callHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  callHeaderText: {
    letterSpacing: 1,
  },
  primaryCard: {
    backgroundColor: Colors.background,
    borderRadius: Radii.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  primaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionFlex: {
    flex: 1,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  emptyCallCard: {
    paddingVertical: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kitchenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBubbleText: {
    fontSize: 10,
    color: Colors.brandDark,
  },
  kitchenInfo: {
    flex: 1,
    gap: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
