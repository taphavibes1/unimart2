import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { db } from '../lib/firebase';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { PAYMENT_STATUSES, LISTING_STATUSES } from '../constants';
import { formatPrice } from '../lib/utils';

type ScanState = 'scanning' | 'processing' | 'success';

export default function ScanQRScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [releasedAmount, setReleasedAmount] = useState(0);
  const [sellerName, setSellerName] = useState('');

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanState !== 'scanning') return;
    setScanState('processing');

    try {
      const scannedPaymentId = data.trim();
      if (!paymentId || scannedPaymentId !== paymentId) {
        Toast.show({ type: 'error', text1: 'Invalid QR Code', text2: 'This QR does not match your payment.' });
        setScanState('scanning');
        return;
      }

      const paymentSnap = await getDoc(doc(db, 'payments', paymentId));
      if (!paymentSnap.exists()) {
        Toast.show({ type: 'error', text1: 'Payment not found' });
        setScanState('scanning');
        return;
      }

      const payment = paymentSnap.data();
      if (payment.status !== PAYMENT_STATUSES.HELD) {
        Toast.show({ type: 'error', text1: 'Invalid payment status', text2: `Status: ${payment.status}` });
        setScanState('scanning');
        return;
      }

      await updateDoc(doc(db, 'payments', paymentId), {
        status: PAYMENT_STATUSES.RELEASED,
        releasedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'listings', payment.listingId), {
        status: LISTING_STATUSES.SOLD,
      });

      setReleasedAmount(payment.amount ?? 0);
      setSellerName(payment.sellerName ?? '');
      setScanState('success');
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not complete transaction.' });
      setScanState('scanning');
    }
  };

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionEmoji}>📷</Text>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>Please allow camera access to scan QR codes.</Text>
        <Button onPress={requestPermission} textColor={Colors.primary}>
          Grant Permission
        </Button>
      </View>
    );
  }

  if (scanState === 'success') {
    return (
      <>
        <Stack.Screen options={{
          title: 'Payment Released!',
          headerStyle: { backgroundColor: Colors.success },
          headerTintColor: '#fff',
        }} />
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Text style={styles.successEmoji}>✅</Text>
          </View>
          <Text style={styles.successTitle}>Transaction Complete!</Text>
          <Text style={styles.successSubtitle}>
            {releasedAmount > 0
              ? `${formatPrice(releasedAmount)} has been released to ${sellerName || 'the seller'}`
              : 'Payment has been released to the seller'}
          </Text>

          <View style={styles.successCard}>
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Status</Text>
              <Text style={styles.successRowValue}>✅ Complete</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Item</Text>
              <Text style={styles.successRowValue}>Marked as Sold</Text>
            </View>
          </View>

          <Text style={styles.successTip}>
            🛡️ You're protected — funds were held in escrow until you approved
          </Text>

          <Button
            mode="contained"
            onPress={() => router.replace('/(tabs)/home')}
            style={styles.homeButton}
            contentStyle={styles.homeButtonContent}
            labelStyle={styles.homeButtonLabel}
            icon="home"
          >
            Back to Marketplace
          </Button>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{
        title: 'Scan Seller QR Code',
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
      }} />
      <View style={styles.container}>
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            📱 Ask the seller to show their QR code, then point your camera at it
          </Text>
        </View>

        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanState === 'scanning' ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            {scanState === 'processing' && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.processingText}>Verifying payment…</Text>
              </View>
            )}
          </View>
        </CameraView>

        <View style={styles.footer}>
          <Text style={styles.footerHint}>
            🔒 Scanning releases funds from escrow to the seller
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.background },
  permissionEmoji: { fontSize: 56, marginBottom: Spacing.md },
  permissionTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  permissionText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },

  // Scanner UI
  instructions: { backgroundColor: Colors.primary, padding: Spacing.md },
  instructionText: { fontSize: FontSize.sm, color: Colors.textOnPrimary, textAlign: 'center' },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanArea: { width: 250, height: 250, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: Colors.accent, borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  processingOverlay: { position: 'absolute', alignItems: 'center', gap: Spacing.md },
  processingText: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
  footer: { backgroundColor: Colors.surface, padding: Spacing.md },
  footerHint: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  // Success state
  successContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, backgroundColor: Colors.background, gap: Spacing.md,
  },
  successCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successEmoji: { fontSize: 56 },
  successTitle: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.success, textAlign: 'center' },
  successSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  successCard: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: Spacing.sm, marginVertical: Spacing.sm,
  },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  successRowLabel: { fontSize: FontSize.md, color: Colors.textSecondary },
  successRowValue: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  successTip: {
    fontSize: FontSize.sm, color: Colors.primary, textAlign: 'center',
    backgroundColor: Colors.primary + '0F', borderRadius: BorderRadius.md,
    padding: Spacing.md, lineHeight: 20, width: '100%',
  },
  homeButton: { width: '100%', borderRadius: BorderRadius.lg, backgroundColor: Colors.success, marginTop: Spacing.sm },
  homeButtonContent: { height: 52 },
  homeButtonLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
});
