import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button, Divider, List } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

  const isVerified = user.verificationStatus === VERIFICATION_STATUSES.VERIFIED;
  const isPending = user.verificationStatus === VERIFICATION_STATUSES.PENDING;
  const isRejected = user.verificationStatus === VERIFICATION_STATUSES.REJECTED;
  const isUnverified = !isVerified && !isPending;

  const verificationColor = isVerified ? Colors.success
    : isPending ? Colors.warning
    : isRejected ? Colors.error
    : Colors.textSecondary;

  const verificationLabel = isVerified ? '✅ Verified Student'
    : isPending ? '⏳ Verification Pending'
    : isRejected ? '❌ Verification Rejected'
    : '⚪ Not Verified';

  const avatarRingColor = isVerified ? Colors.accent
    : isPending ? Colors.warning
    : Colors.surface;

  const initial = user.name?.[0]?.toUpperCase() || '?';

  const joinYear = user.createdAt
    ? new Date(user.createdAt).getFullYear()
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/edit-profile')} style={styles.editIconWrap}>
          <MaterialCommunityIcons name="pencil" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={[styles.avatarRing, { borderColor: avatarRingColor }]}>
          <Avatar.Text
            size={72}
            label={initial}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
          {isVerified && (
            <View style={styles.verifiedBadgePin}>
              <MaterialCommunityIcons name="check-decagram" size={20} color={Colors.accent} />
            </View>
          )}
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={[styles.verificationChip, { backgroundColor: verificationColor + '28' }]}>
          <Text style={[styles.verificationChipText, { color: verificationColor }]}>
            {verificationLabel}
          </Text>
        </View>
        {user.isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminText}>⚡ Admin</Text>
          </View>
        )}
      </View>

      {/* Stats row — floats over the header */}
      <View style={styles.statsCard}>
        <StatBox
          label="Rating"
          value={user.rating > 0 ? user.rating.toFixed(1) : '—'}
          icon="star"
          iconColor={Colors.warning}
        />
        <View style={styles.statsDivider} />
        <StatBox
          label="Sales"
          value={user.totalSales > 0 ? user.totalSales.toString() : '0'}
          icon="package-variant-closed"
          iconColor={Colors.primary}
        />
        <View style={styles.statsDivider} />
        <StatBox
          label="Wallet"
          value={formatPrice(user.walletBalance || 0)}
          icon="wallet"
          iconColor={Colors.success}
        />
      </View>

      {/* Verification nudge */}
      {(isUnverified || isRejected) && (
        <TouchableOpacity style={styles.verifyNudge} onPress={() => router.push('/admin')} activeOpacity={0.85}>
          <MaterialCommunityIcons name="shield-alert" size={22} color={Colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifyNudgeTitle}>
              {isRejected ? 'Re-submit Verification' : 'Verify Your Student ID'}
            </Text>
            <Text style={styles.verifyNudgeSubtitle}>
              {isRejected
                ? 'Your ID was rejected. Submit a clearer photo to unlock selling.'
                : 'Get a ✅ badge and start selling to fellow UNIBEN students'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.warning} />
        </TouchableOpacity>
      )}
      {isPending && (
        <View style={styles.pendingBanner}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.warning} />
          <Text style={styles.pendingBannerText}>
            Student ID under review — usually takes a few hours
          </Text>
        </View>
      )}

      {/* Account section */}
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
          description="Update your name, phone, department"
          left={(p) => <List.Icon {...p} icon="account-edit" color={Colors.primary} />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => router.push('/edit-profile')}
          style={styles.listItem}
        />
      </View>

      {/* Admin section */}
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

      {/* Info section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Info</Text>
        <List.Item
          title="Department"
          description={user.department || '—'}
          left={(p) => <List.Icon {...p} icon="school" color={Colors.textSecondary} />}
          style={styles.listItem}
        />
        <Divider />
        <List.Item
          title="Student ID"
          description={user.studentIdNumber || '—'}
          left={(p) => <List.Icon {...p} icon="card-account-details" color={Colors.textSecondary} />}
          style={styles.listItem}
        />
        <Divider />
        <List.Item
          title="Phone"
          description={user.phone || '—'}
          left={(p) => <List.Icon {...p} icon="phone" color={Colors.textSecondary} />}
          style={styles.listItem}
        />
        {joinYear && (
          <>
            <Divider />
            <List.Item
              title="Member since"
              description={joinYear.toString()}
              left={(p) => <List.Icon {...p} icon="calendar" color={Colors.textSecondary} />}
              style={styles.listItem}
            />
          </>
        )}
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

function StatBox({
  label, value, icon, iconColor,
}: {
  label: string; value: string; icon: string; iconColor: string;
}) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} style={{ marginBottom: 2 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingBottom: 48 },

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
    paddingBottom: Spacing.xl + Spacing.md,
    gap: Spacing.sm,
    position: 'relative',
  },
  editIconWrap: {
    position: 'absolute', top: Spacing.xl + Spacing.md, right: Spacing.md,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarRing: {
    borderWidth: 3, borderRadius: 42, padding: 2,
    position: 'relative',
  },
  avatar: { backgroundColor: Colors.accent },
  avatarLabel: { color: Colors.text, fontWeight: 'bold', fontSize: FontSize.xxl },
  verifiedBadgePin: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: Colors.primary, borderRadius: 12,
  },
  name: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.textOnPrimary },
  email: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  verificationChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  verificationChipText: { fontSize: FontSize.sm, fontWeight: '600' },
  adminBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  adminText: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.text },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: -Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadow.medium,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs },
  statValue: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  statsDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },

  verifyNudge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FFF8E1',
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.warning + '44',
  },
  verifyNudgeTitle: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.text },
  verifyNudgeSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FFF8E1',
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  pendingBannerText: { fontSize: FontSize.sm, color: Colors.warning, flex: 1 },

  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.small,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
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
