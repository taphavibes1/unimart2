import { create } from 'zustand';
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
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  isLoading: false,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setFirebaseUser: (fbUser) => set({ firebaseUser: fbUser }),
  setLoading: (loading) => set({ isLoading: loading }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  logout: () => set({ user: null, firebaseUser: null }),
}));
