import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// getReactNativePersistence is resolved by Metro's react-native condition at build time.
// tsc runs under Node and resolves the Node bundle, which doesn't export it — hence the suppression.
// @ts-expect-error: only available in the Metro/RN bundle, not Node types
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your-app-id',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth with AsyncStorage persistence so users stay logged in between sessions.
// Wrapped in try/catch because Expo fast-refresh may re-run this module and
// Firebase throws if you call initializeAuth on an already-initialized app.
let _auth: ReturnType<typeof getAuth>;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  _auth = getAuth(app);
}

export const auth = _auth;
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
