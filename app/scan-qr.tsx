import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { db } from '../lib/firebase';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { PAYMENT_STATUSES, LISTING_STATUSES } from '../constants';

export default function ScanQRScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isProcessing) return;
    setScanned(true);
    setIsProcessing(true);

    try {
      const scannedPaymentId = data.trim();
      if (!paymentId || scannedPaymentId !== paymentId) {
        Toast.show({ type: 'error', text1: 'Invalid QR Code', text2: 'This QR does not match your payment.' });
        setScanned(false);
        setIsProcessing(false);
        return;
      }

      const paymentSnap = await getDoc(doc(db, 'payments', paymentId));
      if (!paymentSnap.exists()) {
        Toast.show({ type: 'error', text1: 'Payment not found' });
        setIsProcessing(false);
        return;
      }

      const payment = paymentSnap.data();
      if (payment.status !== PAYMENT_STATUSES.HELD) {
        Toast.show({ type: 'error', text1: 'Invalid payment status', text2: `Status: ${payment.status}` });
        setIsProcessing(false);
        return;
      }

      await updateDoc(doc(db, 'payments', paymentId), {
        status: PAYMENT_STATUSES.RELEASED,
        releasedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'listings', payment.listingId), {
        status: LISTING_STATUSES.SOLD,
      });

      Toast.show({ type: 'success', text1: 'Transaction Complete!', text2: 'Payment released to seller.' });
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not complete transaction.' });
      setScanned(false);
    } finally {
      setIsProcessing(false);
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

  return (
    <>
      <Stack.Screen options={{ title: 'Scan Seller QR Code', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.textOnPrimary }} />
      <View style={styles.container}>
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            📱 Ask the seller to show their QR code, then point your camera at it
          </Text>
        </View>

        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.processingText}>Verifying payment...</Text>
              </View>
            )}
          </View>
        </CameraView>

        {scanned && !isProcessing && (
          <View style={styles.rescanContainer}>
            <Button
              mode="contained"
              onPress={() => setScanned(false)}
              style={styles.rescanButton}
            >
              Scan Again
            </Button>
          </View>
        )}
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
  rescanContainer: { padding: Spacing.md, backgroundColor: Colors.surface },
  rescanButton: { borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
});
