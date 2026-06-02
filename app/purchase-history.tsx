import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { subscribeToBuyerPayments } from '../lib/firestore';
import { useAuth } from '../hooks/useAuth';
import { Payment } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { PAYMENT_STATUSES } from '../constants';
import { formatPrice, timeAgo } from '../lib/utils';

const STATUS_CONFIG = {
  [PAYMENT_STATUSES.HELD]: {
    label: 'Awaiting Meetup',
    color: Colors.warning,
    icon: 'clock-outline',
  },
  [PAYMENT_STATUSES.RELEASED]: {
    label: 'Completed',
    color: Colors.success,
    icon: 'check-circle-outline',
  },
  [PAYMENT_STATUSES.REFUNDED]: {
    label: 'Refunded',
    color: Colors.error,
    icon: 'refresh',
  },
};

export default function PurchaseHistoryScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToBuyerPayments(firebaseUser.uid, (data) => {
      setPayments(data);
      setIsLoading(false);
    });
  }, [firebaseUser]);

  const summary = useMemo(() => ({
    totalSpent: payments
      .filter((p) => p.status === PAYMENT_STATUSES.RELEASED)
      .reduce((sum, p) => sum + p.totalAmount, 0),
    pending: payments.filter((p) => p.status === PAYMENT_STATUSES.HELD).length,
    completed: payments.filter((p) => p.status === PAYMENT_STATUSES.RELEASED).length,
  }), [payments]);

  return (
    <>
      <Stack.Screen options={{
        title: 'Purchase History',
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
      }} />
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : payments.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>🛍️</Text>
            <Text style={styles.emptyTitle}>No purchases yet</Text>
            <Text style={styles.emptySubtitle}>Your escrow transactions will appear here</Text>
          </View>
        ) : (
          <>
            {/* Spend summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{formatPrice(summary.totalSpent)}</Text>
                <Text style={styles.summaryLabel}>Total spent</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBox}>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>
                  {summary.completed}
                </Text>
                <Text style={styles.summaryLabel}>Completed</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBox}>
                <Text style={[styles.summaryValue, { color: Colors.warning }]}>
                  {summary.pending}
                </Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
            </View>

            <FlatList
              data={payments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <PaymentCard
                  payment={item}
                  onScanQR={() => router.push(`/scan-qr?paymentId=${item.id}`)}
                />
              )}
            />
          </>
        )}
      </View>
    </>
  );
}

function PaymentCard({
  payment, onScanQR,
}: {
  payment: Payment;
  onScanQR: () => void;
}) {
  const config = STATUS_CONFIG[payment.status as keyof typeof STATUS_CONFIG] ?? {
    label: payment.status,
    color: Colors.textSecondary,
    icon: 'help-circle-outline',
  };
  const isHeld = payment.status === PAYMENT_STATUSES.HELD;

  return (
    <View style={[styles.card, isHeld && styles.cardHeld]}>
      {/* Title + status */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{payment.listingTitle}</Text>
          <Text style={styles.cardTime}>{timeAgo(payment.createdAt)}</Text>
        </View>
        <Chip
          compact
          icon={config.icon}
          style={{ backgroundColor: config.color + '22' }}
          textStyle={{ color: config.color, fontSize: 11, fontWeight: 'bold' }}
        >
          {config.label}
        </Chip>
      </View>

      {/* Price breakdown */}
      <View style={styles.priceBreakdown}>
        {[
          ['Item price', formatPrice(payment.amount)],
          ['Platform fee', formatPrice(payment.fee)],
        ].map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total paid</Text>
          <Text style={styles.totalValue}>{formatPrice(payment.totalAmount)}</Text>
        </View>
      </View>

      {/* Payment method */}
      <View style={styles.methodRow}>
        <MaterialCommunityIcons name="credit-card-outline" size={14} color={Colors.textSecondary} />
        <Text style={styles.methodText}>{payment.paymentMethod}</Text>
        {payment.releasedAt && (
          <>
            <Text style={styles.methodSep}>·</Text>
            <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} />
            <Text style={styles.methodText}>Released {timeAgo(payment.releasedAt)}</Text>
          </>
        )}
      </View>

      {/* Scan QR CTA for held payments */}
      {isHeld && (
        <TouchableOpacity style={styles.scanCTA} onPress={onScanQR} activeOpacity={0.85}>
          <MaterialCommunityIcons name="qrcode-scan" size={18} color={Colors.primary} />
          <Text style={styles.scanCTAText}>Scan Seller QR to complete purchase</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },

  summaryRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    ...Shadow.small,
  },
  summaryBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  summaryValue: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },

  list: { padding: Spacing.md, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: Spacing.sm, ...Shadow.small,
  },
  cardHeld: { borderLeftWidth: 3, borderLeftColor: Colors.warning },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, marginBottom: 2 },
  cardTime: { fontSize: FontSize.xs, color: Colors.placeholder },

  priceBreakdown: { gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  rowValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.xs, paddingTop: Spacing.xs },
  totalLabel: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.text },
  totalValue: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  methodText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  methodSep: { fontSize: FontSize.xs, color: Colors.placeholder },

  scanCTA: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary + '0F',
    borderRadius: BorderRadius.md, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary + '22',
  },
  scanCTAText: { flex: 1, fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
});
