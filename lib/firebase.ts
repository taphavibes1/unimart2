import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your actual Firebase project config
// Create a project at https://console.firebase.google.com
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your-app-id',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
