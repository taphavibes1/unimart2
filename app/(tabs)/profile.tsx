import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button, Divider, List } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { VERIFICATION_STATUSES } from '../../constants';
import { formatPrice } from '../../lib/utils';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, firebaseUser, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      router.replace('/(auth)/welcome');
      Toast.show({ type: 'success', text1: 'Signed out', text2: 'Come back soon!' });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not sign out.' });
    }
  };

  if (!firebaseUser || !user) {
    return (
      <View style={styles.guestContainer}>
        <Text style={styles.guestEmoji}>👤</Text>
        <Text style={styles.guestTitle}>Join Ugbowo Market</Text>
        <Text style={styles.guestSubtitle}>Sign in to manage your listings and purchases</Text>
        <Button
          mode="contained"
          onPress={() => router.push('/(auth)/login')}
          style={styles.signInButton}
          contentStyle={styles.signInContent}
          labelStyle={styles.signInLabel}
        >
          Sign In
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.push('/(auth)/register')}
          style={styles.registerButton}
          labelStyle={styles.registerLabel}
          textColor={Colors.primary}
        >
          Create Account
        </Button>
      </View>
    );
  }

  const verificationColor = {
    [VERIFICATION_STATUSES.VERIFIED]: Colors.success,
    [VERIFICATION_STATUSES.PENDING]: Colors.warning,
    [VERIFICATION_STATUSES.REJECTED]: Colors.error,
  }[user.verificationStatus] || Colors.textSecondary;

  const verificationLabel = {
    [VERIFICATION_STATUSES.VERIFIED]: '✅ Verified Student',
    [VERIFICATION_STATUSES.PENDING]: '⏳ Verification Pending',
    [VERIFICATION_STATUSES.REJECTED]: '❌ Verification Rejected',
  }[user.verificationStatus] || 'Unknown';

  const initial = user.name?.[0]?.toUpperCase() || '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Avatar.Text
          size={72}
          label={initial}
          style={styles.avatar}
          labelStyle={styles.avatarLabel}
        />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={[styles.verificationBadge, { backgroundColor: verificationColor + '22' }]}>
          <Text style={[styles.verificationText, { color: verificationColor }]}>
            {verificationLabel}
          </Text>
        </View>
        {user.isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminText}>⚡ Admin</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <StatBox label="Rating" value={user.rating > 0 ? `⭐ ${user.rating.toFixed(1)}` : '—'} />
        <StatBox label="Sales" value={user.totalSales.toString()} />
        <StatBox label="Wallet" value={formatPrice(user.walletBalance || 0)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <List.Item
          title="My Listings"
          description="View and manage your listings"
          left={(p) => <List.Icon {...p} icon="format-list-bulleted" color={Colors.primary} />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => router.push('/my-listings')}
          style={styles.listItem}
        />
        <Divider />
        <List.Item
          title="Saved Items"
          description="Your bookmarked listings"
          left={(p) => <List.Icon {...p} icon="heart" color={Colors.primary} />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => router.push('/saved-items')}
          style={styles.listItem}
        />
        <Divider />
        <List.Item
          title="Purchase History"
          description="Your completed purchases"
          left={(p) => <List.Icon {...p} icon="shopping" color={Colors.primary} />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => router.push('/purchase-history')}
          style={styles.listItem}
        />
        <Divider />
        <List.Item
          title="Edit Profile"
          description="Update your personal information"
          left={(p) => <List.Icon {...p} icon="account-edit" color={Colors.primary} />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => router.push('/edit-profile')}
          style={styles.listItem}
        />
      </View>

      {user.isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin</Text>
          <List.Item
            title="Admin Panel"
            description="Verify IDs, resolve disputes, manage platform"
            left={(p) => <List.Icon {...p} icon="shield-crown" color={Colors.accent} />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => router.push('/admin')}
            style={styles.listItem}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Info</Text>
        <List.Item
          title="Department"
          description={user.department}
          left={(p) => <List.Icon {...p} icon="school" color={Colors.textSecondary} />}
          style={styles.listItem}
        />
        <Divider />
        <List.Item
          title="Student ID"
          description={user.studentIdNumber}
          left={(p) => <List.Icon {...p} icon="card-account-details" color={Colors.textSecondary} />}
          style={styles.listItem}
        />
        <Divider />
        <List.Item
          title="Phone"
          description={user.phone}
          left={(p) => <List.Icon {...p} icon="phone" color={Colors.textSecondary} />}
          style={styles.listItem}
        />
      </View>

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        contentStyle={styles.logoutContent}
        labelStyle={styles.logoutLabel}
        textColor={Colors.error}
        icon="logout"
      >
        Sign Out
      </Button>
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingBottom: Spacing.xxl },
  guestContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.md, backgroundColor: Colors.background,
  },
  guestEmoji: { fontSize: 64 },
  guestTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.primary },
  guestSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  signInButton: { width: '100%', borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  signInContent: { height: 52 },
  signInLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
  registerButton: { width: '100%', borderRadius: BorderRadius.lg, borderColor: Colors.primary },
  registerLabel: { fontSize: FontSize.lg },
  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingTop: Spacing.xl + Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  avatar: { backgroundColor: Colors.accent },
  avatarLabel: { color: Colors.text, fontWeight: 'bold', fontSize: FontSize.xxl },
  name: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.textOnPrimary },
  email: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  verificationBadge: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  verificationText: { fontSize: FontSize.sm, fontWeight: '600' },
  adminBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  adminText: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.text },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: -Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadow.small,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.small,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listItem: { paddingVertical: Spacing.xs },
  logoutButton: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderColor: Colors.error,
  },
  logoutContent: { height: 52 },
  logoutLabel: { fontSize: FontSize.md, fontWeight: 'bold' },
});
