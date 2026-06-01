import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, RadioButton, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { Listing, Payment } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { DEMO_PAYMENT_METHODS, PAYMENT_STATUSES, LISTING_STATUSES } from '../../constants';
import { formatPrice, calculateFee } from '../../lib/utils';

export default function CheckoutScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const { user, firebaseUser } = useAuthStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    getDoc(doc(db, 'listings', listingId)).then((snap) => {
      if (snap.exists()) setListing({ id: snap.id, ...snap.data() } as Listing);
      setIsLoading(false);
    });
  }, [listingId]);

  const fee = listing ? calculateFee(listing.price) : 0;
  const total = listing ? listing.price + fee : 0;

  const handleConfirm = async () => {
    if (!listing || !firebaseUser || !user) return;
    setIsProcessing(true);
    try {
      const paymentRef = await addDoc(collection(db, 'payments'), {
        listingId: listing.id,
        listingTitle: listing.title,
        buyerId: firebaseUser.uid,
        sellerId: listing.sellerId,
        amount: listing.price,
        fee,
        totalAmount: total,
        paymentMethod,
        status: PAYMENT_STATUSES.HELD,
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'listings', listing.id), { status: LISTING_STATUSES.RESERVED });

      Toast.show({
        type: 'success',
        text1: 'Funds Held in Escrow!',
        text2: 'Meet the seller and scan their QR code to complete the transaction.',
      });

      router.replace(`/scan-qr?paymentId=${paymentRef.id}`);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not process payment. Try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!listing) return <View style={styles.centered}><Text>Listing not found</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: 'Checkout', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.textOnPrimary }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>{listing.title}</Text>
            <Text style={styles.orderValue}>{formatPrice(listing.price)}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Platform Fee (2%)</Text>
            <Text style={styles.feeValue}>{formatPrice(fee)}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.orderRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Text style={styles.demoNote}>⚠️ Demo mode — no real money is transferred</Text>
          <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
            {DEMO_PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => setPaymentMethod(method.id)}
                style={[styles.methodItem, paymentMethod === method.id && styles.methodSelected]}
              >
                <RadioButton value={method.id} color={Colors.primary} />
                <MaterialCommunityIcons
                  name={method.icon as any}
                  size={22}
                  color={paymentMethod === method.id ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.methodLabel, paymentMethod === method.id && styles.methodLabelSelected]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </RadioButton.Group>
        </View>

        <View style={styles.escrowInfo}>
          <Text style={styles.escrowTitle}>🔒 How Demo Escrow Works</Text>
          <Text style={styles.escrowStep}>1. Tap "Confirm & Hold Funds" below</Text>
          <Text style={styles.escrowStep}>2. Meet the seller at a safe campus zone</Text>
          <Text style={styles.escrowStep}>3. Scan the seller's QR code to release payment</Text>
          <Text style={styles.escrowStep}>4. Seller receives funds, item is marked sold</Text>
        </View>

        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={isProcessing}
          disabled={isProcessing}
          style={styles.confirmButton}
          contentStyle={styles.confirmContent}
          labelStyle={styles.confirmLabel}
        >
          Confirm & Hold Funds — {formatPrice(total)}
        </Button>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.small,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  orderLabel: { fontSize: FontSize.md, color: Colors.text },
  orderValue: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  feeValue: { fontSize: FontSize.md, color: Colors.textSecondary },
  divider: { marginVertical: Spacing.sm },
  totalLabel: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  totalValue: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.primary },
  demoNote: { fontSize: FontSize.sm, color: Colors.warning, backgroundColor: '#FFF8E1', padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  methodSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '0A' },
  methodLabel: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  methodLabelSelected: { color: Colors.primary, fontWeight: '600' },
  escrowInfo: {
    backgroundColor: '#E8EAF6',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  escrowTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.xs },
  escrowStep: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 22 },
  confirmButton: { borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  confirmContent: { height: 56 },
  confirmLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
});
