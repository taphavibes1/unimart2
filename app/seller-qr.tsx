import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Payment } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { formatPrice, timeAgo } from '../lib/utils';

export default function SellerQRScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listener so the screen updates the moment the buyer scans
  useEffect(() => {
    if (!paymentId) return;
    const unsub = onSnapshot(doc(db, 'payments', paymentId), (snap) => {
      if (snap.exists()) setPayment({ id: snap.id, ...snap.data() } as Payment);
      setIsLoading(false);
    });
    return unsub;
  }, [paymentId]);

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  if (!payment) {
    return <View style={styles.centered}><Text>Payment not found</Text></View>;
  }

  const isPaid = payment.status === 'released';

  return (
    <>
      <Stack.Screen
        options={{
          title: isPaid ? '✅ Payment Received!' : 'My QR Code',
          headerStyle: { backgroundColor: isPaid ? Colors.success : Colors.primary },
          headerTintColor: Colors.textOnPrimary,
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>

        {isPaid ? (
          /* ── PAID STATE ── */
          <View style={styles.paidSection}>
            <View style={styles.paidCircle}>
              <Text style={styles.paidEmoji}>✅</Text>
            </View>
            <Text style={styles.paidTitle}>Payment Released!</Text>
            <Text style={styles.paidSubtitle}>
              {formatPrice(payment.amount)} has been released to you
            </Text>
            <View style={styles.paidDetails}>
              <Text style={styles.paidItem}>{payment.listingTitle}</Text>
              <Text style={styles.paidTime}>Released {timeAgo(payment.releasedAt ?? payment.createdAt)}</Text>
            </View>
            <View style={styles.paidActions}>
              <Text style={styles.paidActionText} onPress={() => router.replace('/(tabs)/home')}>
                Back to Marketplace →
              </Text>
            </View>
          </View>
        ) : (
          /* ── WAITING STATE ── */
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Show this to the buyer</Text>
              <Text style={styles.headerSubtitle}>
                They will scan it to release the payment to you
              </Text>
            </View>

            <View style={styles.qrCard}>
              <QRCode
                value={payment.id}
                size={240}
                color={Colors.primary}
                backgroundColor="#FFFFFF"
              />
              <View style={styles.waitingRow}>
                <View style={styles.waitingDot} />
                <Text style={styles.waitingText}>Waiting for buyer to scan…</Text>
              </View>
              <Text style={styles.paymentId}>#{payment.id.substring(0, 14).toUpperCase()}</Text>
            </View>

            <View style={styles.details}>
              <Text style={styles.detailTitle}>Payment Details</Text>
              {[
                ['Item', payment.listingTitle],
                ['Item price', formatPrice(payment.amount)],
                ['Platform fee', formatPrice(payment.fee)],
                ['Total held', formatPrice(payment.totalAmount)],
                ['Status', '🔒 Held in escrow'],
              ].map(([label, value]) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>📋 Instructions</Text>
              {[
                'Meet the buyer at an agreed safe zone',
                'Hand over the item and let the buyer inspect it',
                'Show this QR code to the buyer',
                'Buyer scans → payment instantly released to you',
              ].map((step, i) => (
                <View key={i} style={styles.instructionRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.instructionStep}>{step}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.md, gap: Spacing.md, alignItems: 'center', backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Paid state
  paidSection: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md, width: '100%' },
  paidCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
  },
  paidEmoji: { fontSize: 52 },
  paidTitle: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.success },
  paidSubtitle: { fontSize: FontSize.lg, color: Colors.textSecondary, textAlign: 'center' },
  paidDetails: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, width: '100%', alignItems: 'center', gap: Spacing.xs,
    ...Shadow.small,
  },
  paidItem: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  paidTime: { fontSize: FontSize.sm, color: Colors.textSecondary },
  paidActions: { marginTop: Spacing.md },
  paidActionText: { fontSize: FontSize.md, color: Colors.primary, fontWeight: 'bold' },

  // Waiting state
  header: { alignItems: 'center', gap: Spacing.xs },
  headerTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.primary, textAlign: 'center' },
  headerSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  qrCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, ...Shadow.medium,
  },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  waitingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
  waitingText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  paymentId: { fontSize: FontSize.xs, color: Colors.placeholder, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' as any },
  details: {
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, ...Shadow.small,
  },
  detailTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  detailValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  instructions: { width: '100%', backgroundColor: '#E8EAF6', borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  instructionsTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.xs },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: FontSize.xs, color: '#fff', fontWeight: 'bold' },
  instructionStep: { fontSize: FontSize.sm, color: Colors.text, flex: 1, lineHeight: 20 },
});
