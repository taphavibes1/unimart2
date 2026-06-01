import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';

export default function VerificationBanner() {
  const { isPending, isRejected, isGuest } = useAuth();
  const router = useRouter();

  if (isGuest) {
    return (
      <View style={[styles.banner, styles.guestBanner]}>
        <Text style={styles.bannerText}>
          👀 Browsing as guest — sign in to chat, buy, or sell
        </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.bannerAction}>Sign In →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={[styles.banner, styles.pendingBanner]}>
        <Text style={styles.bannerText}>
          ⏳ ID pending verification — you can browse but not list or buy yet
        </Text>
      </View>
    );
  }

  if (isRejected) {
    return (
      <View style={[styles.banner, styles.rejectedBanner]}>
        <Text style={styles.bannerText}>
          ❌ Verification rejected — contact admin or re-register
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  guestBanner: { backgroundColor: '#E3F2FD' },
  pendingBanner: { backgroundColor: '#FFF8E1' },
  rejectedBanner: { backgroundColor: '#FFEBEE' },
  bannerText: { flex: 1, fontSize: FontSize.xs, color: Colors.text, lineHeight: 18 },
  bannerAction: {
    fontSize: FontSize.xs,
    fontWeight: 'bold',
    color: Colors.primary,
    flexShrink: 0,
  },
});
