import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { API_URL, invoicesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatMoney } from '@/lib/format';
import { copyToClipboard, openUrl, openWhatsApp } from '@/lib/links';
import { useInvoice } from '@/lib/queries';
import type { PaymentStatus } from '@/lib/types';

const STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIAL: 'Partially paid',
  PAID: 'Paid',
};

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { business } = useAuth();
  const { data: invoice, isLoading, isError, error, refetch, isRefetching } = useInvoice(id);
  const toast = useToast();

  if (isError && !invoice) {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </Pressable>
          <AppText variant="h2">Receipt</AppText>
        </View>
        <ErrorState error={error} title="Couldn’t load this receipt" onRetry={() => refetch()} retrying={isRefetching} />
      </Screen>
    );
  }

  if (isLoading || !invoice) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.centerFill}>
        <ActivityIndicator color={Colors.brand} />
      </Screen>
    );
  }

  const { order } = invoice;
  const publicUrl = business ? invoicesApi.publicReceiptUrl(business.slug, invoice.invoiceNumber) : null;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </Pressable>
        <View>
          <AppText variant="eyebrow">Receipt</AppText>
          <AppText variant="h2">{invoice.invoiceNumber}</AppText>
        </View>
      </View>

      <Card style={styles.receiptCard}>
        <View style={styles.businessRow}>
          <View style={styles.avatar}>
            <AppText variant="h2" color={Colors.brand}>
              {business?.name?.[0]?.toUpperCase() ?? '?'}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyBold">{business?.name}</AppText>
            <AppText variant="small" color={Colors.textMuted}>
              {[business?.address, business?.phone].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.billRow}>
          <View>
            <AppText variant="eyebrow">Billed to</AppText>
            <AppText variant="bodyBold">{order.customer.name}</AppText>
            <AppText variant="small" color={Colors.textMuted}>
              {order.customer.phone}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="eyebrow">Issued</AppText>
            <AppText variant="small">{formatDate(invoice.issuedDate, { day: 'numeric', month: 'short', year: 'numeric' })}</AppText>
            {order.deliveryDate ? (
              <AppText variant="small" color={Colors.textMuted}>
                Delivery {formatDate(order.deliveryDate, { day: 'numeric', month: 'short' })}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={styles.divider} />

        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <AppText variant="body" style={{ flex: 1 }}>
              {item.description}
            </AppText>
            <AppText variant="bodyBold">{formatMoney(item.lineTotal)}</AppText>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <AppText variant="small" color={Colors.textMuted}>
            Subtotal
          </AppText>
          <AppText variant="body">{formatMoney(order.totalAmount)}</AppText>
        </View>
        <View style={styles.itemRow}>
          <AppText variant="small" color={Colors.textMuted}>
            Advance paid
          </AppText>
          <AppText variant="body">– {formatMoney(order.advancePaid)}</AppText>
        </View>
        <View style={styles.itemRow}>
          <AppText variant="bodyBold">Balance due</AppText>
          <AppText variant="h2" color={Colors.brand}>
            {formatMoney(order.balanceDue)}
          </AppText>
        </View>

        <Pill tone={invoice.paymentStatus === 'PAID' ? 'success' : 'peachSoft'} label={STATUS_LABEL[invoice.paymentStatus]} />

        <AppText variant="small" color={Colors.textMuted}>
          Thank you for ordering! {publicUrl ? `· ${publicUrl}` : ''}
        </AppText>
      </Card>

      <View style={{ gap: Spacing.two }}>
        <Button
          label="Send on WhatsApp"
          variant="success"
          onPress={() =>
            openWhatsApp(
              order.customer.phone,
              `Hi ${order.customer.name}, here's your receipt from ${business?.name ?? 'us'}: ${publicUrl ?? invoice.invoiceNumber}. Balance due: ${formatMoney(order.balanceDue)}.`
            ).catch((e) => toast.fromError(e))
          }
        />
        <View style={styles.buttonRow}>
          <View style={styles.buttonFlex}>
            <Button
              label="Download PDF"
              variant="outline"
              disabled={!invoice.pdfUrl}
              onPress={() =>
                invoice.pdfUrl &&
                openUrl(invoice.pdfUrl.startsWith('http') ? invoice.pdfUrl : `${API_URL}${invoice.pdfUrl}`).catch((e) =>
                  toast.fromError(e, 'Couldn’t open the PDF')
                )
              }
            />
          </View>
          <View style={styles.buttonFlex}>
            <Button
              label="Copy link"
              variant="outline"
              disabled={!publicUrl}
              onPress={() =>
                publicUrl &&
                copyToClipboard(publicUrl)
                  .then(() => toast.success('Receipt link copied'))
                  .catch((e) => toast.fromError(e))
              }
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  receiptCard: {
    gap: Spacing.two,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  buttonFlex: {
    flex: 1,
  },
});
