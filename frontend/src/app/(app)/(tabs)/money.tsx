import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getMoneyBreakdown } from '@/lib/business-logic';
import { formatMoney } from '@/lib/format';
import { openWhatsApp } from '@/lib/links';
import { useAddPayment, useInvoices } from '@/lib/queries';

export default function MoneyScreen() {
  const { data: invoices = [], isLoading, isError, error, refetch, isRefetching } = useInvoices();
  const addPayment = useAddPayment();
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  const today = useMemo(() => new Date(), []);
  const breakdown = useMemo(() => getMoneyBreakdown(invoices, today), [invoices, today]);

  const barTotal = breakdown.totalDue || 1;

  async function markPaid(invoiceId: string, balance: number) {
    setBusyId(invoiceId);
    try {
      await addPayment.mutateAsync({ invoiceId, amount: balance, method: 'cash' });
      toast.success('Payment recorded');
    } catch (err) {
      toast.fromError(err, 'Couldn’t record the payment');
    } finally {
      setBusyId(null);
    }
  }

  if (isError && invoices.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <AppText variant="eyebrow">Money</AppText>
        </View>
        <ErrorState error={error} title="Couldn’t load your invoices" onRetry={() => refetch()} retrying={isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">Money</AppText>
      </View>

      <Card tone="brand" style={styles.outstandingCard}>
        <AppText variant="eyebrow" color={Colors.textOnDark}>
          Outstanding
        </AppText>
        <AppText variant="h1" color={Colors.white} style={styles.outstandingAmount}>
          {formatMoney(breakdown.totalDue)}
        </AppText>
        <AppText variant="body" color={Colors.textOnDark}>
          across {breakdown.customerCount} customer{breakdown.customerCount === 1 ? '' : 's'}
          {breakdown.overdueCount > 0 ? ` · ${breakdown.overdueCount} overdue` : ''}
        </AppText>

        <View style={styles.bar}>
          <View style={[styles.barSeg, { flex: breakdown.dueLater || 0.001, backgroundColor: 'rgba(255,255,255,0.35)' }]} />
          <View style={[styles.barSeg, { flex: breakdown.dueThisWeek || 0.001, backgroundColor: Colors.accentSoft }]} />
          <View style={[styles.barSeg, { flex: breakdown.overdue || 0.001, backgroundColor: Colors.white }]} />
        </View>
        <View style={styles.barLegend}>
          <AppText variant="small" color={Colors.textOnDark}>
            Due later {formatMoney(breakdown.dueLater)}
          </AppText>
          <AppText variant="small" color={Colors.textOnDark}>
            This week {formatMoney(breakdown.dueThisWeek)}
          </AppText>
          <AppText variant="small" color={Colors.textOnDark}>
            Overdue {formatMoney(breakdown.overdue)}
          </AppText>
        </View>
      </Card>

      <AppText variant="h2">Who owes what</AppText>
      {!isLoading && breakdown.rows.length === 0 ? (
        <EmptyState title="All settled up" hint="No outstanding balances right now." />
      ) : (
        <View style={{ gap: Spacing.two }}>
          {breakdown.rows.map(({ invoice, balance, overdueDays }) => (
            <Card key={invoice.id} style={styles.row}>
              <Pressable style={styles.rowInfo} onPress={() => router.push(`/receipt/${invoice.id}`)}>
                <AppText variant="bodyBold">{invoice.order.customer.name}</AppText>
                <AppText variant="small" color={overdueDays ? Colors.brand : Colors.textMuted}>
                  {overdueDays ? `Overdue ${overdueDays} day${overdueDays === 1 ? '' : 's'}` : 'Due soon'} · {invoice.invoiceNumber}
                </AppText>
              </Pressable>
              <AppText variant="bodyBold">{formatMoney(balance)}</AppText>
              {overdueDays ? (
                <Button
                  label="Remind"
                  variant="outline"
                  fullWidth={false}
                  onPress={() =>
                    openWhatsApp(
                      invoice.order.customer.phone,
                      `Hi ${invoice.order.customer.name}, friendly reminder that ${formatMoney(balance)} is due for invoice ${invoice.invoiceNumber}. Thank you!`
                    ).catch((e) => toast.fromError(e))
                  }
                  style={styles.rowButton}
                />
              ) : (
                <Button
                  label="Mark paid"
                  variant="outline"
                  fullWidth={false}
                  loading={busyId === invoice.id}
                  onPress={() => markPaid(invoice.id, balance)}
                  style={styles.rowButton}
                />
              )}
            </Card>
          ))}
        </View>
      )}

      <AppText variant="h2">Received this week</AppText>
      {breakdown.receivedThisWeek.length === 0 ? (
        <Card tone="muted">
          <AppText variant="body" color={Colors.textMuted}>
            No payments logged this week yet.
          </AppText>
        </Card>
      ) : (
        <Card tone="muted" style={{ gap: Spacing.two }}>
          {breakdown.receivedThisWeek.map((p, i) => (
            <View key={i} style={styles.receivedRow}>
              <AppText variant="body">
                {p.invoice.order.customer.name}
                {p.method ? ` · ${p.method}` : ''}
              </AppText>
              <AppText variant="bodyBold">{formatMoney(p.amount)}</AppText>
            </View>
          ))}
        </Card>
      )}

      <Pressable onPress={() => router.push('/insights')} style={styles.insightsLink}>
        <AppText variant="bodyBold" color={Colors.brand}>
          View this month's insights →
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: Spacing.two,
  },
  outstandingCard: {
    gap: Spacing.one,
  },
  outstandingAmount: {
    fontSize: 40,
  },
  bar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  barSeg: {
    height: '100%',
  },
  barLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowButton: {
    paddingHorizontal: Spacing.three,
    minWidth: 96,
  },
  receivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightsLink: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
});
