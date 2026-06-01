import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { paperTheme } from '../constants/theme';
import { toastConfig } from '../components/ui/ToastConfig';

export default function RootLayout() {
  const { setUser, setFirebaseUser, setInitialized } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            setUser({ id: fbUser.uid, ...userDoc.data() } as any);
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setInitialized(true);
    });

    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="light" backgroundColor="#1A237E" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listing/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="create-listing" options={{ headerShown: true, title: 'Create Listing' }} />
          <Stack.Screen name="checkout/[listingId]" options={{ headerShown: true, title: 'Checkout' }} />
          <Stack.Screen name="scan-qr" options={{ headerShown: true, title: 'Scan QR Code' }} />
          <Stack.Screen name="admin" options={{ headerShown: true, title: 'Admin Panel' }} />
        </Stack>
        <Toast config={toastConfig} />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
