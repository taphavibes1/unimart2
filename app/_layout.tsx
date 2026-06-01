import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { paperTheme, Colors } from '../constants/theme';
import { toastConfig } from '../components/ui/ToastConfig';

export default function RootLayout() {
  const { setUser, setFirebaseUser, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    // Safety timeout: if Firebase doesn't respond in 5s, unblock the app anyway
    const timeout = setTimeout(() => setInitialized(true), 5000);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(timeout);
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            setUser({ id: fbUser.uid, ...userDoc.data() } as any);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setInitialized(true);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Block rendering until Firebase restores auth state from AsyncStorage
  if (!isInitialized) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="light" backgroundColor={Colors.primary} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="listing/[id]"
            options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="chat/[id]"
            options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="create-listing"
            options={{ headerShown: true, title: 'Create Listing', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="checkout/[listingId]"
            options={{ headerShown: true, title: 'Checkout', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="scan-qr"
            options={{ headerShown: true, title: 'Scan QR Code', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="seller-qr"
            options={{ headerShown: true, title: 'My QR Code', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="admin"
            options={{ headerShown: true, title: 'Admin Panel', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="my-listings"
            options={{ headerShown: true, title: 'My Listings', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="saved-items"
            options={{ headerShown: true, title: 'Saved Items', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="purchase-history"
            options={{ headerShown: true, title: 'Purchase History', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{ headerShown: true, title: 'Edit Profile', headerBackTitle: 'Back' }}
          />
        </Stack>
        <Toast config={toastConfig} />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
