import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pill, type PillTone } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Colors, FontSizes, Fonts, Radii, Spacing } from '@/constants/theme';
import { formatDate, formatMoney, toNumber } from '@/lib/format';
import { useOrders } from '@/lib/queries';
import type { Order, OrderStatus } from '@/lib/types';

const STATUS_TONE: Record<OrderStatus, PillTone> = {
  INQUIRY: 'outline',
  CONFIRMED: 'peachSoft',
  IN_PROGRESS: 'accentSoft',
  READY: 'success',
  DELIVERED: 'neutral',
  CANCELLED: 'danger',
};

const FILTERS: { key: OrderStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'INQUIRY', label: 'Inquiry' },
  { key: 'IN_PROGRESS', label: 'Baking' },
  { key: 'READY', label: 'Ready' },
];

function statusLabel(status: OrderStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
}

export default function OrdersListScreen() {
  const { data: orders = [], isLoading, isError, error, refetch, isRefetching } = useOrders();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: orders.length };
    for (const o of orders) map[o.status] = (map[o.status] ?? 0) + 1;
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((o) => filter === 'ALL' || o.status === filter)
      .filter((o) => !q || o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q))
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, search, filter]);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">{orders.length} orders</AppText>
        <AppText variant="h1">Orders</AppText>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or phone"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)}>
              <View style={[styles.filterChip, active && styles.filterChipActive]}>
                <AppText variant="bodyBold" color={active ? Colors.white : Colors.text}>
                  {f.label} {counts[f.key] ?? 0}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>

      {isError && orders.length === 0 ? (
        <ErrorState error={error} title="Couldn’t load your orders" onRetry={() => refetch()} retrying={isRefetching} />
      ) : !isLoading && filtered.length === 0 ? (
        <EmptyState title="No orders yet" hint="Tap the + button to create your first order." />
      ) : (
        <View style={{ gap: Spacing.two }}>
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <Pressable onPress={() => router.push(`/orders/${order.id}`)}>
      <Card>
        <View style={styles.rowTop}>
          <AppText variant="bodyBold">{order.customer.name}</AppText>
          <Pill tone={STATUS_TONE[order.status]} label={statusLabel(order.status)} />
        </View>
        <AppText variant="small" color={Colors.textMuted}>
          {order.items[0]?.description}
          {order.items.length > 1 ? ` +${order.items.length - 1} more` : ''}
          {order.occasionTag ? ` · ${order.occasionTag}` : ''}
        </AppText>
        <View style={styles.divider} />
        <View style={styles.rowBottom}>
          <AppText variant="small" color={Colors.textMuted}>
            {order.deliveryDate ? formatDate(order.deliveryDate, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : formatDate(order.orderDate)}
          </AppText>
          <AppText variant="bodyBold">{formatMoney(order.totalAmount)}</AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginTop: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.card,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.body,
    color: Colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  filterChip: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterChipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.two,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
