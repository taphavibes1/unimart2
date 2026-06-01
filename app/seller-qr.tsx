import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, ActivityIndicator, Card } from 'react-native-paper';
import { useLocalSearchParams, Stack } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Payment } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { formatPrice, timeAgo } from '../lib/utils';

export default function SellerQRScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) return;
    getDoc(doc(db, 'payments', paymentId)).then((snap) => {
      if (snap.exists()) setPayment({ id: snap.id, ...snap.data() } as Payment);
      setIsLoading(false);
    });
  }, [paymentId]);

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!payment) return <View style={styles.centered}><Text>Payment not found</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: 'My QR Code', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.textOnPrimary }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Show this QR to the buyer</Text>
          <Text style={styles.headerSubtitle}>
            Let the buyer scan this code to release the payment
          </Text>
        </View>

        <View style={styles.qrCard}>
          <QRCode
            value={payment.id}
            size={240}
            color={Colors.primary}
            backgroundColor="#FFFFFF"
          />
          <Text style={styles.paymentId}>ID: {payment.id.substring(0, 12)}...</Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.detailTitle}>Payment Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Item</Text>
            <Text style={styles.detailValue}>{payment.listingTitle}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{formatPrice(payment.amount)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, { color: Colors.warning, fontWeight: 'bold' }]}>
              {payment.status.toUpperCase()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{timeAgo(payment.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>📋 Instructions</Text>
          <Text style={styles.instructionStep}>1. Meet the buyer at an agreed safe zone</Text>
          <Text style={styles.instructionStep}>2. Hand over the item to the buyer</Text>
          <Text style={styles.instructionStep}>3. Show this QR code to the buyer</Text>
          <Text style={styles.instructionStep}>4. Buyer scans → payment released to you</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.md, gap: Spacing.md, alignItems: 'center', backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', gap: Spacing.xs },
  headerTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.primary, textAlign: 'center' },
  headerSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  qrCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.medium,
  },
  paymentId: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'monospace' },
  details: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.small,
  },
  detailTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  detailValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  instructions: {
    width: '100%',
    backgroundColor: '#E8EAF6',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  instructionsTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.xs },
  instructionStep: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 22 },
});
