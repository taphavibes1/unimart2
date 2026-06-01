import { useAuthStore } from '../store/authStore';
import { VERIFICATION_STATUSES } from '../constants';

export function useAuth() {
  const store = useAuthStore();

  const isGuest = !store.firebaseUser;
  const isLoggedIn = !!store.firebaseUser;
  const isVerified = store.user?.verificationStatus === VERIFICATION_STATUSES.VERIFIED;
  const isPending = store.user?.verificationStatus === VERIFICATION_STATUSES.PENDING;
  const isRejected = store.user?.verificationStatus === VERIFICATION_STATUSES.REJECTED;
  const isAdmin = store.user?.isAdmin === true;

  return {
    ...store,
    isGuest,
    isLoggedIn,
    isVerified,
    isPending,
    isRejected,
    isAdmin,
  };
}
