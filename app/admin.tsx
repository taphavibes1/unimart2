import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image, ScrollView } from 'react-native';
import { Text, Button, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import {
  subscribeToPendingUsers, subscribeToHeldPayments,
  setVerificationStatus, refundPayment,
} from '../lib/firestore';
import { seedDemoListings } from '../lib/seed';
import { useAuth } from '../hooks/useAuth';
import { User, Payment } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { formatPrice, timeAgo } from '../lib/utils';

type AdminTab = 'users' | 'payments' | 'seed';

export default function AdminScreen() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [heldPayments, setHeldPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [isLoading, setIsLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const u1 = subscribeToPendingUsers((users) => {
      setPendingUsers(users);
      setIsLoading(false);
    });
    const u2 = subscribeToHeldPayments(setHeldPayments);
    return () => { u1(); u2(); };
  }, [isAdmin]);

  const handleApprove = async (uid: string, name: string) => {
    await setVerificationStatus(uid, 'verified');
    Toast.show({ type: 'success', text1: `✅ ${name} verified` });
  };

  const handleReject = async (uid: string, name: string) => {
    await setVerificationStatus(uid, 'rejected');
    Toast.show({ type: 'info', text1: `❌ ${name} rejected` });
  };

  const handleRefund = async (payment: Payment) => {
    await refundPayment(payment.id, payment.listingId);
    Toast.show({ type: 'success', text1: 'Refunded', text2: 'Listing restored to available.' });
  };

  const handleSeedData = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const count = await seedDemoListings(user.id, user.name);
      Toast.show({ type: 'success', text1: `🌱 Seeded ${count} demo listings!` });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Seed failed', text2: String(e) });
    } finally {
      setSeeding(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.restricted}>
        <Text style={styles.restrictedEmoji}>🚫</Text>
        <Text style={styles.restrictedTitle}>Admin Access Only</Text>
        <Button onPress={() => router.back()} textColor={Colors.primary}>Go Back</Button>
      </View>
    );
  }

  const tabs: { id: AdminTab; label: string; count?: number }[] = [
    { id: 'users', label: 'Pending IDs', count: pendingUsers.length },
    { id: 'payments', label: 'Held Payments', count: heldPayments.length },
    { id: 'seed', label: 'Seed Data' },
  ];

  return (
    <>
      <Stack.Screen options={{
        title: 'Admin Panel',
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
      }} />
      <View style={styles.container}>
        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <Chip
              key={tab.id}
              selected={activeTab === tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              textStyle={activeTab === tab.id ? styles.tabTextActive : styles.tabText}
            >
              {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
            </Chip>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : activeTab === 'users' ? (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState emoji="✅" text="No pending verifications" />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.email}</Text>
                <Text style={styles.cardMeta}>{item.department} • ID: {item.studentIdNumber}</Text>
                <Text style={styles.cardTime}>Applied {timeAgo(item.createdAt)}</Text>
                {item.studentIdImageUrl ? (
                  <Image source={{ uri: item.studentIdImageUrl }} style={styles.idImage} />
                ) : (
                  <View style={styles.noIdImage}>
                    <Text style={styles.noIdText}>No ID image uploaded</Text>
                  </View>
                )}
                <View style={styles.cardActions}>
                  <Button
                    mode="contained"
                    onPress={() => handleApprove(item.id, item.name)}
                    style={styles.approveBtn}
                    icon="check"
                  >
                    Approve
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleReject(item.id, item.name)}
                    style={styles.rejectBtn}
                    textColor={Colors.error}
                    icon="close"
                  >
                    Reject
                  </Button>
                </View>
              </View>
            )}
          />
        ) : activeTab === 'payments' ? (
          <FlatList
            data={heldPayments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState emoji="💰" text="No held payments" />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardName}>{item.listingTitle}</Text>
                <Text style={styles.cardMeta}>
                  {formatPrice(item.amount)} + {formatPrice(item.fee)} fee
                </Text>
                <Text style={styles.cardMeta}>Method: {item.paymentMethod}</Text>
                <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
                <Button
                  mode="outlined"
                  onPress={() => handleRefund(item)}
                  style={styles.refundBtn}
                  textColor={Colors.error}
                  icon="undo-variant"
                >
                  Issue Refund
                </Button>
              </View>
            )}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.seedContainer}>
            <Text style={styles.seedTitle}>🌱 Seed Demo Data</Text>
            <Text style={styles.seedDesc}>
              Populate the marketplace with realistic demo listings for testing purposes.
              All listings will be attributed to your account as the seller.
            </Text>
            <View style={styles.seedWarning}>
              <Text style={styles.seedWarningText}>
                ⚠️ This creates real Firestore documents. Run once to avoid duplicates.
              </Text>
            </View>
            <Button
              mode="contained"
              onPress={handleSeedData}
              loading={seeding}
              disabled={seeding}
              style={styles.seedButton}
              contentStyle={styles.seedButtonContent}
              labelStyle={styles.seedButtonLabel}
              icon="database-plus"
            >
              {seeding ? 'Seeding...' : 'Seed 10 Demo Listings'}
            </Button>
          </ScrollView>
        )}
      </View>
    </>
  );
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  restrictedEmoji: { fontSize: 56 },
  restrictedTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text },
  tabScroll: { flexGrow: 0, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabs: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  tab: { backgroundColor: Colors.background },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.text },
  tabTextActive: { color: Colors.textOnPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.md, gap: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: FontSize.lg, color: Colors.textSecondary },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, ...Shadow.small },
  cardName: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cardTime: { fontSize: FontSize.xs, color: Colors.placeholder },
  idImage: { width: '100%', height: 180, borderRadius: BorderRadius.md, resizeMode: 'cover' },
  noIdImage: { height: 80, backgroundColor: Colors.border, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  noIdText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  approveBtn: { flex: 1, backgroundColor: Colors.success },
  rejectBtn: { flex: 1, borderColor: Colors.error },
  refundBtn: { marginTop: Spacing.xs, borderColor: Colors.error },
  seedContainer: { padding: Spacing.lg, gap: Spacing.md },
  seedTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.primary },
  seedDesc: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  seedWarning: { backgroundColor: '#FFF8E1', borderRadius: BorderRadius.md, padding: Spacing.md },
  seedWarningText: { fontSize: FontSize.sm, color: Colors.warning, lineHeight: 20 },
  seedButton: { borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  seedButtonContent: { height: 52 },
  seedButtonLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },
});
