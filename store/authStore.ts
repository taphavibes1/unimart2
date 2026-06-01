import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';

interface AuthState {
  user: User | null;
  firebaseUser: any | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setFirebaseUser: (fbUser: any | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setFirebaseUser: (fbUser) => set({ firebaseUser: fbUser }),
  setLoading: (loading) => set({ isLoading: loading }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),

  refreshUser: async () => {
    const { firebaseUser } = get();
    if (!firebaseUser) return;
    try {
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (snap.exists()) {
        set({ user: { id: firebaseUser.uid, ...snap.data() } as User });
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  },

  logout: () => set({ user: null, firebaseUser: null }),
}));
