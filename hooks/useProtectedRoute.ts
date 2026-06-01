import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();
  const { firebaseUser, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!firebaseUser && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (firebaseUser && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [firebaseUser, isInitialized, segments]);
}
