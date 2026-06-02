import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Button, RadioButton, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getListing, createPayment, updateListingStatus } from '../../lib/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Listing } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { DEMO_PAYMENT_METHODS, PAYMENT_STATUSES, LISTING_STATUSES } from '../../constants';
import { formatPrice, calculateFee } from '../../lib/utils';

export default function CheckoutScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    getListing(listingId).then((l) => {
      setListing(l);
      setIsLoading(false);
    });
  }, [listingId]);

  const fee = listing ? calculateFee(listing.price) : 0;
  const total = listing ? listing.price + fee : 0;

  const handleConfirm = async () => {
    if (!listing || !firebaseUser || !user) return;
    setIsProcessing(true);
    try {
      const paymentId = await createPayment({
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

      await updateListingStatus(listing.id, LISTING_STATUSES.RESERVED);

      Toast.show({
        type: 'success',
        text1: '🔒 Funds Held!',
        text2: 'Meet the seller and scan their QR code to complete.',
      });
      router.replace(`/scan-qr?paymentId=${paymentId}`);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not process. Try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (!listing) {
    return <View style={styles.centered}><Text>Listing not found</Text></View>;
  }

  return (
    <>
      <Stack.Screen options={{
        title: 'Checkout',
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
      }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Item preview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.itemPreview}>
            {listing.imageUrls?.[0] ? (
              <Image source={{ uri: listing.imageUrls[0] }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                <Text style={styles.itemImagePlaceholderText}>📦</Text>
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={2}>{listing.title}</Text>
              <View style={styles.sellerRow}>
                <MaterialCommunityIcons name="account-circle-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.sellerName} numberOfLines={1}>
                  {listing.sellerName || 'Seller'}
                </Text>
                {listing.sellerRating && listing.sellerRating > 0 ? (
                  <View style={styles.ratingBadge}>
                    <MaterialCommunityIcons name="star" size={11} color={Colors.warning} />
                    <Text style={styles.ratingText}>{listing.sellerRating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.priceBreakdown}>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Item price</Text>
              <Text style={styles.orderValue}>{formatPrice(listing.price)}</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Platform fee (2%)</Text>
              <Text style={styles.feeValue}>{formatPrice(fee)}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.orderRow}>
              <Text style={styles.totalLabel}>Total charged</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </View>
        </View>

        {/* Escrow badge */}
        <View style={styles.escrowBadge}>
          <MaterialCommunityIcons name="shield-lock" size={20} color={Colors.primary} />
          <Text style={styles.escrowBadgeText}>
            Funds are locked in escrow until you receive & approve the item
          </Text>
        </View>

        {/* Payment method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.demoNotice}>
            <MaterialCommunityIcons name="information-outline" size={16} color={Colors.warning} />
            <Text style={styles.demoNoticeText}>Demo mode — no real money moves</Text>
          </View>
          <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
            {DEMO_PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => setPaymentMethod(method.id)}
                style={[
                  styles.methodItem,
                  paymentMethod === method.id && styles.methodSelected,
                ]}
              >
                <RadioButton value={method.id} color={Colors.primary} />
                <MaterialCommunityIcons
                  name={method.icon as any}
                  size={22}
                  color={paymentMethod === method.id ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[
                  styles.methodLabel,
                  paymentMethod === method.id && styles.methodLabelSelected,
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </RadioButton.Group>
        </View>

        {/* How escrow works */}
        <View style={styles.escrowCard}>
          <Text style={styles.escrowTitle}>🔒 How Escrow Works</Text>
          {[
            'Tap "Hold Funds" — payment is locked in escrow',
            'Meet the seller at a safe campus zone',
            'Inspect the item before releasing payment',
            "Scan seller's QR code to release funds",
            'Seller receives payment, item marked sold',
          ].map((step, i) => (
            <View key={i} style={styles.escrowStep}>
              <View style={styles.escrowNum}>
                <Text style={styles.escrowNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.escrowStepText}>{step}</Text>
            </View>
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={isProcessing}
          disabled={isProcessing}
          style={styles.confirmButton}
          contentStyle={styles.confirmContent}
          labelStyle={styles.confirmLabel}
          icon="lock"
        >
          Hold Funds — {formatPrice(total)}
        </Button>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.small },
  cardTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },

  // Item preview
  itemPreview: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  itemImage: { width: 80, height: 80, borderRadius: BorderRadius.md, resizeMode: 'cover', flexShrink: 0 },
  itemImagePlaceholder: { backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  itemImagePlaceholderText: { fontSize: 28 },
  itemInfo: { flex: 1, justifyContent: 'center', gap: Spacing.xs },
  itemTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, lineHeight: 20 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerName: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FFF8E1', borderRadius: BorderRadius.round,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  ratingText: { fontSize: 10, color: Colors.warning, fontWeight: 'bold' },

  // Price breakdown
  priceBreakdown: { gap: 0 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  orderLabel: { fontSize: FontSize.md, color: Colors.text },
  orderValue: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  feeValue: { fontSize: FontSize.md, color: Colors.textSecondary },
  divider: { marginVertical: Spacing.sm },
  totalLabel: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  totalValue: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.primary },

  // Escrow badge
  escrowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary + '0F', borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '22',
  },
  escrowBadgeText: { fontSize: FontSize.sm, color: Colors.primary, flex: 1, lineHeight: 18 },

  // Payment method
  demoNotice: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: '#FFF8E1', borderRadius: BorderRadius.sm,
    padding: Spacing.sm, marginBottom: Spacing.md,
  },
  demoNoticeText: { fontSize: FontSize.sm, color: Colors.warning },
  methodItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, gap: Spacing.sm,
    marginBottom: Spacing.xs, borderWidth: 1, borderColor: 'transparent',
  },
  methodSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '0A' },
  methodLabel: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  methodLabelSelected: { color: Colors.primary, fontWeight: '600' },

  // How escrow works
  escrowCard: { backgroundColor: '#E8EAF6', borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  escrowTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.xs },
  escrowStep: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  escrowNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  escrowNumText: { fontSize: FontSize.xs, color: '#fff', fontWeight: 'bold' },
  escrowStepText: { fontSize: FontSize.sm, color: Colors.text, flex: 1, lineHeight: 20 },

  confirmButton: { borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  confirmContent: { height: 56 },
  confirmLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
});
