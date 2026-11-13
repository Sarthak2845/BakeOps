import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Pill, type PillTone } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Radii, Spacing, themedStyles } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  deliveriesOn,
  deliveryTimeLabel,
  getUpcomingOccasions,
  isActiveOrder,
  isLate,
  monthRange,
  nextStep,
  ordersInRange,
  prepList,
  sumBalanceDue,
  sumTotals,
} from '@/lib/business-logic';
import { getErrorMessage } from '@/lib/errors';
import { formatDate, formatMoney, toNumber } from '@/lib/format';
import { openUrl, openWhatsApp } from '@/lib/links';
import { useCustomers, useOrders, useUpdateOrderStatus } from '@/lib/queries';
import type { Order, OrderStatus } from '@/lib/types';
import { useTheme } from '@/lib/theme-context';

const STATUS_TONE: Record<OrderStatus, PillTone> = {
  INQUIRY: 'outline',
  CONFIRMED: 'peachSoft',
  IN_PROGRESS: 'accentSoft',
  READY: 'success',
  DELIVERED: 'neutral',
  CANCELLED: 'danger',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  INQUIRY: 'Inquiry',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'Baking',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STRIP_DAYS = 7;
const ATTENTION_LIMIT = 4;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function itemsSummary(order: Order): string {
  const first = order.items[0];
  if (!first) return 'No items';
  const qty = toNumber(first.quantity);
  return `${qty !== 1 ? `${qty}× ` : ''}${first.description}${order.items.length > 1 ? ` +${order.items.length - 1} more` : ''}`;
}

function formatQty(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export default function HomeScreen() {
  useTheme();
  const { user, business } = useAuth();
  const toast = useToast();
  const customersQuery = useCustomers();
  const ordersQuery = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data]);
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const loadError = ordersQuery.error ?? customersQuery.error;

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => startOfDay(now), [now]);
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [busyId, setBusyId] = useState<string | null>(null);

  const todays = useMemo(() => deliveriesOn(orders, today), [orders, today]);
  const dayDeliveries = useMemo(() => deliveriesOn(orders, selectedDay), [orders, selectedDay]);
  const prep = useMemo(() => prepList(dayDeliveries), [dayDeliveries]);
  const upcoming = useMemo(() => getUpcomingOccasions(customers, orders, today, 14), [customers, orders, today]);

  const strip = useMemo(
    () =>
      Array.from({ length: STRIP_DAYS }, (_, i) => {
        const day = addDays(today, i);
        const list = deliveriesOn(orders, day);
        return { day, count: list.length, open: list.filter((o) => o.status !== 'DELIVERED').length };
      }),
    [orders, today]
  );

  const summary = useMemo(() => {
    const delivered = todays.filter((o) => o.status === 'DELIVERED').length;
    const ready = todays.filter((o) => o.status === 'READY').length;
    const baking = todays.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'CONFIRMED').length;
    const toCollect = sumBalanceDue(todays.filter((o) => o.status !== 'DELIVERED'));
    return { total: todays.length, delivered, ready, baking, toCollect };
  }, [todays]);

  // Late orders first, then inquiries for the next two days that still need confirming.
  const attention = useMemo(() => {
    const soon = addDays(today, 2);
    const late = orders
      .filter((o) => isLate(o, now))
      .map((o) => ({ order: o, kind: 'late' as const }));
    const unconfirmed = orders
      .filter((o) => o.status === 'INQUIRY' && o.deliveryDate && !isLate(o, now) && new Date(o.deliveryDate) < addDays(soon, 1))
      .map((o) => ({ order: o, kind: 'confirm' as const }));
    return [...late, ...unconfirmed];
  }, [orders, today, now]);

  const month = useMemo(() => {
    const { start, end } = monthRange(today);
    const monthOrders = ordersInRange(orders, start, end);
    return { revenue: sumTotals(monthOrders), count: monthOrders.length, due: sumBalanceDue(orders.filter(isActiveOrder)) };
  }, [orders, today]);

  const currency = business?.currency ?? 'INR';
  const selectedIsToday = selectedDay.getTime() === today.getTime();
  const dayName = selectedIsToday
    ? 'Today'
    : selectedDay.getTime() === addDays(today, 1).getTime()
      ? 'Tomorrow'
      : selectedDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  async function advance(order: Order) {
    const step = nextStep(order.status);
    if (!step) return;
    setBusyId(order.id);
    try {
      await updateStatus.mutateAsync({ id: order.id, status: step.status });
      toast.success(`${order.customer.name}: ${STATUS_LABEL[step.status].toLowerCase()}`);
    } catch (err) {
      toast.fromError(err, 'Couldn’t update the order');
    } finally {
      setBusyId(null);
    }
  }

  const loading = ordersQuery.isLoading && orders.length === 0;

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="eyebrow">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </AppText>
          <AppText variant="h1">
            {greeting(now)}, {user?.name?.split(' ')[0] ?? 'there'}
          </AppText>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={styles.logo} accessibilityLabel="Profile">
          {business?.logoUrl ? (
            <Image source={{ uri: business.logoUrl }} style={styles.logoImage} contentFit="cover" />
          ) : (
            <AppText variant="h2" color={Colors.brand}>
              {business?.name?.[0]?.toUpperCase() ?? '?'}
            </AppText>
          )}
        </Pressable>
      </View>

      <FormError
        message={loadError ? `Couldn’t load today’s data. ${getErrorMessage(loadError)}` : null}
        onRetry={() => {
          if (ordersQuery.isError) void ordersQuery.refetch();
          if (customersQuery.isError) void customersQuery.refetch();
        }}
      />

      {/* Today at a glance */}
      <Card tone="brand" style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.flex}>
            <AppText variant="eyebrow" color={Colors.textOnDark}>
              Today
            </AppText>
            <AppText variant="h1" color={Colors.white}>
              {loading ? '…' : summary.total === 0 ? 'No deliveries' : `${summary.total} deliver${summary.total === 1 ? 'y' : 'ies'}`}
            </AppText>
          </View>
          <Pressable onPress={() => router.push('/orders/new')} style={styles.heroAdd} accessibilityLabel="New order">
            <Ionicons name="add" size={24} color={Colors.brand} />
          </Pressable>
        </View>

        {summary.total > 0 ? (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: summary.delivered }]} />
              <View style={{ flex: summary.total - summary.delivered }} />
            </View>
            <View style={styles.heroStats}>
              <HeroStat value={summary.delivered} label="delivered" />
              <HeroStat value={summary.ready} label="ready" />
              <HeroStat value={summary.baking} label="to bake" />
            </View>
          </>
        ) : (
          <AppText variant="body" color={Colors.textOnDark}>
            {loading ? 'Loading your orders…' : 'A quiet day. Tap + to add an order.'}
          </AppText>
        )}

        {summary.toCollect > 0 ? (
          <View style={styles.collectRow}>
            <Ionicons name="wallet-outline" size={16} color={Colors.white} />
            <AppText variant="bodyBold" color={Colors.white}>
              {formatMoney(summary.toCollect, currency)} to collect on today’s deliveries
            </AppText>
          </View>
        ) : null}
      </Card>

      {/* Needs attention */}
      {attention.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h2">Needs attention</AppText>
            <Pill tone="danger" size="sm" label={String(attention.length)} />
          </View>
          <Card padded={false} style={styles.listCard}>
            {attention.slice(0, ATTENTION_LIMIT).map(({ order, kind }) => (
              <Pressable key={`${kind}-${order.id}`} style={styles.attentionRow} onPress={() => router.push(`/orders/${order.id}`)}>
                <View style={[styles.attentionIcon, { backgroundColor: kind === 'late' ? Colors.dangerSoft : Colors.warningSoft }]}>
                  <Ionicons
                    name={kind === 'late' ? 'alarm-outline' : 'help-circle-outline'}
                    size={18}
                    color={kind === 'late' ? Colors.danger : Colors.warning}
                  />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {order.customer.name}
                  </AppText>
                  <AppText variant="small" color={kind === 'late' ? Colors.dangerSoftText : Colors.textMuted} numberOfLines={1}>
                    {kind === 'late'
                      ? `Late · was due ${formatDate(order.deliveryDate, { day: 'numeric', month: 'short' })}${order.deliveryDate && deliveryTimeLabel(order.deliveryDate) !== 'Any time' ? `, ${deliveryTimeLabel(order.deliveryDate)}` : ''}`
                      : `Not confirmed · for ${formatDate(order.deliveryDate, { weekday: 'short', day: 'numeric', month: 'short' })}`}
                  </AppText>
                </View>
                {kind === 'confirm' ? (
                  <Button label="Confirm" variant="outline" fullWidth={false} style={styles.smallButton} loading={busyId === order.id} onPress={() => advance(order)} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                )}
              </Pressable>
            ))}
          </Card>
          {attention.length > ATTENTION_LIMIT ? (
            <Pressable onPress={() => router.push('/orders')}>
              <AppText variant="small" color={Colors.brand}>
                +{attention.length - ATTENTION_LIMIT} more in Orders →
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Next 7 days */}
      <View style={styles.section}>
        <AppText variant="h2">Deliveries</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {strip.map(({ day, count, open }, i) => {
            const active = day.getTime() === selectedDay.getTime();
            return (
              <Pressable
                key={day.toISOString()}
                onPress={() => setSelectedDay(day)}
                style={[styles.dayChip, active && styles.dayChipActive]}
                accessibilityLabel={`${day.toDateString()}, ${count} deliveries`}>
                <AppText variant="small" color={active ? Colors.textOnDark : Colors.textMuted}>
                  {i === 0 ? 'Today' : day.toLocaleDateString('en-IN', { weekday: 'short' })}
                </AppText>
                <AppText variant="h2" color={active ? Colors.white : Colors.text}>
                  {day.getDate()}
                </AppText>
                <View style={[styles.countDot, count === 0 && styles.countDotEmpty, active && styles.countDotActive]}>
                  <AppText variant="small" color={active ? Colors.brand : count === 0 ? Colors.textMuted : Colors.white} style={styles.countText}>
                    {count}
                  </AppText>
                </View>
                {open === 0 && count > 0 ? <Ionicons name="checkmark-circle" size={12} color={active ? Colors.white : Colors.success} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={Colors.brand} />
        ) : dayDeliveries.length === 0 ? (
          <Card style={styles.emptyDay}>
            <Ionicons name="cafe-outline" size={22} color={Colors.textMuted} />
            <AppText variant="body" color={Colors.textMuted}>
              No deliveries {selectedIsToday ? 'today' : `on ${dayName}`}.
            </AppText>
          </Card>
        ) : (
          <View style={styles.list}>
            {dayDeliveries.map((order) => {
              const step = nextStep(order.status);
              const late = isLate(order, now);
              const balance = toNumber(order.balanceDue);
              return (
                <Pressable key={order.id} onPress={() => router.push(`/orders/${order.id}`)}>
                  <Card style={[styles.deliveryCard, order.status === 'DELIVERED' && styles.deliveredCard]}>
                    <View style={styles.deliveryTop}>
                      <View style={[styles.timeBubble, late && styles.timeBubbleLate]}>
                        <AppText variant="small" style={styles.timeText} color={late ? Colors.dangerSoftText : Colors.brandDark}>
                          {deliveryTimeLabel(order.deliveryDate)}
                        </AppText>
                      </View>
                      <View style={styles.flex}>
                        <AppText variant="bodyBold" numberOfLines={1}>
                          {order.customer.name}
                        </AppText>
                        <AppText variant="small" color={Colors.textMuted} numberOfLines={1}>
                          {itemsSummary(order)}
                        </AppText>
                      </View>
                      <Pill tone={late ? 'danger' : STATUS_TONE[order.status]} size="sm" label={late ? 'Late' : STATUS_LABEL[order.status]} />
                    </View>

                    {order.status !== 'DELIVERED' ? (
                      <View style={styles.deliveryBottom}>
                        <AppText variant="small" color={balance > 0 ? Colors.text : Colors.successSoftText} style={styles.flex}>
                          {balance > 0 ? `${formatMoney(balance, currency)} due` : 'Fully paid'}
                          {order.occasionTag ? ` · ${order.occasionTag}` : ''}
                        </AppText>
                        <Pressable
                          onPress={() => openUrl(`tel:${order.customer.phone}`).catch((e) => toast.fromError(e))}
                          style={styles.iconButton}
                          hitSlop={4}
                          accessibilityLabel={`Call ${order.customer.name}`}>
                          <Ionicons name="call-outline" size={16} color={Colors.brand} />
                        </Pressable>
                        {step ? (
                          <Button
                            label={step.label}
                            variant={step.status === 'DELIVERED' ? 'success' : 'outline'}
                            fullWidth={false}
                            style={styles.smallButton}
                            loading={busyId === order.id}
                            disabled={busyId !== null && busyId !== order.id}
                            onPress={() => advance(order)}
                          />
                        ) : null}
                      </View>
                    ) : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Prep list */}
      {prep.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h2">To bake · {dayName}</AppText>
            <AppText variant="small" color={Colors.textMuted}>
              not yet ready
            </AppText>
          </View>
          <Card style={styles.prepCard}>
            {prep.map((p) => (
              <View key={p.description} style={styles.prepRow}>
                <View style={styles.prepQty}>
                  <AppText variant="bodyBold" color={Colors.brandDark}>
                    {formatQty(p.quantity)}×
                  </AppText>
                </View>
                <AppText variant="body" style={styles.flex}>
                  {p.description}
                </AppText>
                <AppText variant="small" color={Colors.textMuted}>
                  {p.orders} order{p.orders === 1 ? '' : 's'}
                </AppText>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {/* Occasion reminders */}
      {upcoming.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h2">Call for upcoming occasions</AppText>
          </View>
          <View style={styles.list}>
            {upcoming.slice(0, 3).map((u) => (
              <Card key={`${u.customer.id}-${u.occasion.id}`} style={styles.occasionCard}>
                <View style={styles.occasionTop}>
                  <View style={styles.occasionIcon}>
                    <Ionicons name="gift-outline" size={18} color={Colors.accent} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="bodyBold">{u.customer.name}</AppText>
                    <AppText variant="small" color={Colors.textMuted}>
                      {u.occasion.label} {u.daysUntil === 0 ? 'today' : `in ${u.daysUntil} day${u.daysUntil === 1 ? '' : 's'}`}
                      {u.yearsRunning > 0 ? ` · ordered ${u.yearsRunning} yr${u.yearsRunning === 1 ? '' : 's'} running` : ''}
                    </AppText>
                    {u.lastOrderSummary ? (
                      <AppText variant="small" color={Colors.textMuted} numberOfLines={1}>
                        Last time: {u.lastOrderSummary}
                      </AppText>
                    ) : null}
                  </View>
                </View>
                <View style={styles.occasionActions}>
                  <View style={styles.flex}>
                    <Button
                      label="WhatsApp"
                      variant="success"
                      onPress={() =>
                        openWhatsApp(
                          u.customer.phone,
                          `Hi ${u.customer.name}! ${u.occasion.label} is coming up in ${u.daysUntil} day${u.daysUntil === 1 ? '' : 's'} — would you like to order a cake? – ${business?.name ?? ''}`
                        ).catch((e) => toast.fromError(e))
                      }
                    />
                  </View>
                  <View style={styles.flex}>
                    <Button label="Call" variant="outline" onPress={() => openUrl(`tel:${u.customer.phone}`).catch((e) => toast.fromError(e))} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      {/* This month */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="h2">This month</AppText>
          <Pressable onPress={() => router.push('/insights')} hitSlop={6}>
            <AppText variant="bodyBold" color={Colors.brand}>
              Insights →
            </AppText>
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <StatTile value={formatMoney(month.revenue, currency)} label="sales" />
          <StatTile value={String(month.count)} label="orders" />
          <Pressable style={styles.flex} onPress={() => router.push('/money')}>
            <StatTile value={formatMoney(month.due, currency)} label="to collect →" />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  useTheme();
  return (
    <View style={styles.heroStat}>
      <AppText variant="h2" color={Colors.white}>
        {value}
      </AppText>
      <AppText variant="small" color={Colors.textOnDark}>
        {label}
      </AppText>
    </View>
  );
}

const styles = themedStyles(() => ({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  hero: {
    gap: Spacing.three,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroAdd: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: {
    backgroundColor: Colors.white,
  },
  heroStats: {
    flexDirection: 'row',
  },
  heroStat: {
    flex: 1,
  },
  collectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radii.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + 4,
  },
  section: {
    gap: Spacing.two + 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  listCard: {
    overflow: 'hidden',
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  attentionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  strip: {
    gap: Spacing.two,
  },
  dayChip: {
    width: 64,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radii.lg,
    backgroundColor: Colors.card,
  },
  dayChipActive: {
    backgroundColor: Colors.brand,
  },
  countDot: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  countDotEmpty: {
    backgroundColor: Colors.backgroundMuted,
  },
  countDotActive: {
    backgroundColor: Colors.white,
  },
  countText: {
    fontSize: 11,
    lineHeight: 14,
  },
  emptyDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  deliveryCard: {
    gap: Spacing.two + 2,
  },
  deliveredCard: {
    opacity: 0.6,
  },
  deliveryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  timeBubble: {
    minWidth: 64,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.md,
    backgroundColor: Colors.backgroundMuted,
    alignItems: 'center',
  },
  timeBubbleLate: {
    backgroundColor: Colors.dangerSoft,
  },
  timeText: {
    fontWeight: '700',
  },
  deliveryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepCard: {
    gap: Spacing.two + 2,
  },
  prepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  prepQty: {
    minWidth: 44,
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.sm,
    backgroundColor: Colors.backgroundMuted,
    alignItems: 'center',
  },
  occasionCard: {
    gap: Spacing.three,
  },
  occasionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  occasionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  occasionActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
}));
