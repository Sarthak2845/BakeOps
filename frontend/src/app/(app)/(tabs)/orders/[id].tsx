import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing, themedStyles } from '@/constants/theme';
import { formatDate, formatMoney } from '@/lib/format';
import { openUrl, openWhatsApp } from '@/lib/links';
import { useGenerateInvoice, useOrder, useUpdateOrderStatus } from '@/lib/queries';
import type { OrderStatus } from '@/lib/types';
import { useTheme } from '@/lib/theme-context';

const PIPELINE: OrderStatus[] = ['INQUIRY', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'DELIVERED'];
const PIPELINE_LABEL: Record<OrderStatus, string> = {
  INQUIRY: 'Inquiry',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'Baking',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function OrderDetailScreen() {
  useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch, isRefetching } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const generateInvoice = useGenerateInvoice();
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (isError && !order) {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </Pressable>
          <AppText variant="h2">Order</AppText>
        </View>
        <ErrorState error={error} title="Couldn’t load this order" onRetry={() => refetch()} retrying={isRefetching} />
      </Screen>
    );
  }

  if (isLoading || !order) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.centerFill}>
        <ActivityIndicator color={Colors.brand} />
      </Screen>
    );
  }

  const currentIndex = PIPELINE.indexOf(order.status);
  const nextStatus = order.status === 'CANCELLED' ? null : PIPELINE[currentIndex + 1];
  const canCancel = order.status !== 'DELIVERED' && order.status !== 'CANCELLED';

  async function advance(status: OrderStatus) {
    setBusy(true);
    try {
      await updateStatus.mutateAsync({ id: order!.id, status });
    } catch (err) {
      toast.fromError(err, status === 'CANCELLED' ? 'Couldn’t cancel the order' : 'Couldn’t update the order');
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateInvoice() {
    setBusy(true);
    try {
      const { invoice } = await generateInvoice.mutateAsync(order!.id);
      router.push(`/receipt/${invoice.id}`);
    } catch (err) {
      toast.fromError(err, 'Couldn’t generate the invoice');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </Pressable>
        <View>
          <AppText variant="eyebrow">Order</AppText>
          <AppText variant="h2">{order.customer.name}</AppText>
        </View>
      </View>

      <Card style={styles.contactCard}>
        <View>
          <AppText variant="bodyBold">{order.customer.phone}</AppText>
          {order.occasionTag ? (
            <AppText variant="small" color={Colors.textMuted}>
              {order.occasionTag}
            </AppText>
          ) : null}
        </View>
        <View style={styles.contactActions}>
          <Pressable style={styles.iconButton} onPress={() => openWhatsApp(order.customer.phone, `Hi ${order.customer.name}!`).catch((e) => toast.fromError(e))}>
            <Ionicons name="logo-whatsapp" size={18} color={Colors.success} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => openUrl(`tel:${order.customer.phone}`).catch((e) => toast.fromError(e))}>
            <Ionicons name="call" size={18} color={Colors.brand} />
          </Pressable>
        </View>
      </Card>

      {order.status === 'CANCELLED' ? (
        <Card tone="muted">
          <AppText variant="bodyBold">This order was cancelled.</AppText>
        </Card>
      ) : (
        <View style={styles.pipeline}>
          {PIPELINE.map((status, index) => (
            <View key={status} style={styles.pipelineStep}>
              <View style={[styles.pipelineDot, index <= currentIndex && styles.pipelineDotActive]} />
              <AppText variant="small" color={index <= currentIndex ? Colors.brand : Colors.textMuted}>
                {PIPELINE_LABEL[status]}
              </AppText>
            </View>
          ))}
        </View>
      )}

      <Card style={styles.itemsCard}>
        <AppText variant="bodyMedium">Items</AppText>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <AppText variant="body" style={{ flex: 1 }}>
              {item.description} ×{item.quantity}
            </AppText>
            <AppText variant="bodyBold">{formatMoney(item.lineTotal)}</AppText>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.itemRow}>
          <AppText variant="small" color={Colors.textMuted}>
            Total
          </AppText>
          <AppText variant="bodyBold">{formatMoney(order.totalAmount)}</AppText>
        </View>
        <View style={styles.itemRow}>
          <AppText variant="small" color={Colors.textMuted}>
            Advance paid
          </AppText>
          <AppText variant="body">{formatMoney(order.advancePaid)}</AppText>
        </View>
        <View style={styles.itemRow}>
          <AppText variant="bodyBold">Balance due</AppText>
          <AppText variant="bodyBold" color={Colors.brand}>
            {formatMoney(order.balanceDue)}
          </AppText>
        </View>
      </Card>

      {order.deliveryDate ? (
        <AppText variant="small" color={Colors.textMuted}>
          Delivery: {formatDate(order.deliveryDate, { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        {nextStatus ? <Button label={`Mark as ${PIPELINE_LABEL[nextStatus]}`} onPress={() => advance(nextStatus)} loading={busy} /> : null}

        {order.invoice ? (
          <Button label="View receipt" variant="outline" onPress={() => router.push(`/receipt/${order.invoice!.id}`)} />
        ) : (
          <Button label="Generate invoice" variant="outline" onPress={onGenerateInvoice} loading={busy} />
        )}

        {canCancel ? (
          <Button label="Cancel order" variant="ghost" onPress={() => advance('CANCELLED')} loading={busy} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  centerFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pipelineStep: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  pipelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.backgroundMuted,
  },
  pipelineDotActive: {
    backgroundColor: Colors.brand,
  },
  itemsCard: {
    gap: Spacing.one + 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  actions: {
    gap: Spacing.two,
  },
}));
