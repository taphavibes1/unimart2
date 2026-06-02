import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Text, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'refund';
    id: string;
    name: string;
    payment?: Payment;
  } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const u1 = subscribeToPendingUsers((users) => {
      setPendingUsers(users);
      setIsLoading(false);
    });
    const u2 = subscribeToHeldPayments(setHeldPayments);
    return () => { u1(); u2(); };
  }, [isAdmin]);

  const escrowTotal = heldPayments.reduce((sum, p) => sum + p.totalAmount, 0);

  const execConfirmed = async () => {
    if (!confirmAction) return;
    const { type, id, name, payment } = confirmAction;
    setConfirmAction(null);
    if (type === 'approve') {
      await setVerificationStatus(id, 'verified');
      Toast.show({ type: 'success', text1: `✅ ${name} verified` });
    } else if (type === 'reject') {
      await setVerificationStatus(id, 'rejected');
      Toast.show({ type: 'info', text1: `❌ ${name} rejected` });
    } else if (type === 'refund' && payment) {
      await refundPayment(payment.id, payment.listingId);
      Toast.show({ type: 'success', text1: 'Refunded', text2: 'Listing restored to available.' });
    }
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
    { id: 'payments', label: 'Held Funds', count: heldPayments.length },
    { id: 'seed', label: '🌱 Seed' },
  ];

  return (
    <>
      <Stack.Screen options={{
        title: 'Admin Panel',
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
      }} />
      <View style={styles.container}>

        {/* Dashboard stats */}
        <View style={styles.statsBar}>
          <StatCard
            icon="shield-account"
            value={pendingUsers.length.toString()}
            label="Pending IDs"
            color={pendingUsers.length > 0 ? Colors.warning : Colors.success}
          />
          <View style={styles.statsDivider} />
          <StatCard
            icon="lock-clock"
            value={heldPayments.length.toString()}
            label="Held payments"
            color={heldPayments.length > 0 ? Colors.warning : Colors.success}
          />
          <View style={styles.statsDivider} />
          <StatCard
            icon="currency-usd"
            value={formatPrice(escrowTotal)}
            label="In escrow"
            color={Colors.primary}
          />
        </View>

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

        {/* Content */}
        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : activeTab === 'users' ? (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyText}>No pending verifications</Text>
                <Text style={styles.emptySubtext}>All submitted IDs have been reviewed</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                {/* User info */}
                <View style={styles.userHeader}>
                  <View style={styles.userInitial}>
                    <Text style={styles.userInitialText}>{item.name[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardMeta}>{item.email}</Text>
                  </View>
                  <Text style={styles.cardTime}>Applied {timeAgo(item.createdAt)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <DetailPill icon="school" text={item.department} />
                  <DetailPill icon="card-account-details-outline" text={item.studentIdNumber} />
                  {item.phone ? <DetailPill icon="phone" text={item.phone} /> : null}
                </View>

                {/* ID image */}
                {item.studentIdImageUrl ? (
                  <TouchableOpacity onPress={() => setPreviewImage(item.studentIdImageUrl!)}>
                    <Image source={{ uri: item.studentIdImageUrl }} style={styles.idImage} />
                    <View style={styles.idImageHint}>
                      <MaterialCommunityIcons name="magnify-plus-outline" size={14} color="#fff" />
                      <Text style={styles.idImageHintText}>Tap to zoom</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noIdImage}>
                    <MaterialCommunityIcons name="image-off-outline" size={28} color={Colors.placeholder} />
                    <Text style={styles.noIdText}>No ID image uploaded</Text>
                  </View>
                )}

                <View style={styles.cardActions}>
                  <Button
                    mode="contained"
                    onPress={() => setConfirmAction({ type: 'approve', id: item.id, name: item.name })}
                    style={styles.approveBtn}
                    icon="check"
                  >
                    Approve
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => setConfirmAction({ type: 'reject', id: item.id, name: item.name })}
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
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>💰</Text>
                <Text style={styles.emptyText}>No held payments</Text>
                <Text style={styles.emptySubtext}>All funds have been released or refunded</Text>
              </View>
            }
            renderItem={({ item }) => {
              const heldMs = Date.now() - new Date(item.createdAt).getTime();
              const heldHours = heldMs / (1000 * 60 * 60);
              const isStale = heldHours > 48;
              return (
                <View style={[styles.card, isStale && styles.cardStale]}>
                  {isStale && (
                    <View style={styles.staleBanner}>
                      <MaterialCommunityIcons name="alert" size={14} color={Colors.error} />
                      <Text style={styles.staleBannerText}>Stale — held over 48 hrs</Text>
                    </View>
                  )}
                  <View style={styles.paymentHeader}>
                    <Text style={styles.cardName} numberOfLines={2}>{item.listingTitle}</Text>
                    <Text style={styles.escrowAmount}>{formatPrice(item.totalAmount)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <DetailPill icon="currency-usd" text={`${formatPrice(item.amount)} + ${formatPrice(item.fee)} fee`} />
                    <DetailPill icon="credit-card-outline" text={item.paymentMethod} />
                  </View>
                  <Text style={styles.cardTime}>
                    Held {timeAgo(item.createdAt)} · #{item.id.substring(0, 10).toUpperCase()}
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => setConfirmAction({
                      type: 'refund', id: item.id, name: item.listingTitle, payment: item,
                    })}
                    style={styles.refundBtn}
                    textColor={Colors.error}
                    icon="undo-variant"
                  >
                    Issue Refund
                  </Button>
                </View>
              );
            }}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.seedContainer}>
            <MaterialCommunityIcons name="database-plus" size={48} color={Colors.primary} />
            <Text style={styles.seedTitle}>Seed Demo Data</Text>
            <Text style={styles.seedDesc}>
              Populate the marketplace with realistic demo listings for testing.
              All listings will be attributed to your account as seller.
            </Text>
            <View style={styles.seedItems}>
              {['Books & study materials', 'Electronics & gadgets', 'Clothing & accessories', 'Hostel supplies'].map((item) => (
                <View key={item} style={styles.seedItemRow}>
                  <MaterialCommunityIcons name="check" size={14} color={Colors.success} />
                  <Text style={styles.seedItemText}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={styles.seedWarning}>
              <MaterialCommunityIcons name="alert-outline" size={16} color={Colors.warning} />
              <Text style={styles.seedWarningText}>
                Creates real Firestore documents. Run once to avoid duplicates.
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
              {seeding ? 'Seeding…' : 'Seed 10 Demo Listings'}
            </Button>
          </ScrollView>
        )}
      </View>

      {/* ID image fullscreen preview */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={styles.previewOverlay} onPress={() => setPreviewImage(null)} activeOpacity={1}>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          )}
          <View style={styles.previewClose}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm action dialog */}
      <Modal visible={!!confirmAction} transparent animationType="fade" onRequestClose={() => setConfirmAction(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>
              {confirmAction?.type === 'approve' ? '✅ Approve Verification'
                : confirmAction?.type === 'reject' ? '❌ Reject Verification'
                : '↩️ Issue Refund'}
            </Text>
            <Text style={styles.dialogBody}>
              {confirmAction?.type === 'approve'
                ? `Grant ✅ Verified Student badge to ${confirmAction.name}?`
                : confirmAction?.type === 'reject'
                ? `Reject the ID submission from ${confirmAction.name}? They'll be asked to resubmit.`
                : `Refund the held payment for "${confirmAction?.name}"? The listing will be restored to available.`}
            </Text>
            <View style={styles.dialogActions}>
              <Button mode="outlined" onPress={() => setConfirmAction(null)} textColor={Colors.textSecondary} style={styles.dialogBtn}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={execConfirmed}
                style={[styles.dialogBtn, {
                  backgroundColor: confirmAction?.type === 'approve' ? Colors.success : Colors.error,
                }]}
              >
                Confirm
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailPill({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.detailPill}>
      <MaterialCommunityIcons name={icon as any} size={12} color={Colors.textSecondary} />
      <Text style={styles.detailPillText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  restrictedEmoji: { fontSize: 56 },
  restrictedTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text },

  statsBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border, ...Shadow.small,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 2 },
  statValue: { fontSize: FontSize.lg, fontWeight: 'bold' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statsDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },

  tabScroll: { flexGrow: 0, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabs: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  tab: { backgroundColor: Colors.background },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.text },
  tabTextActive: { color: Colors.textOnPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.md, gap: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textSecondary },

  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: Spacing.sm, ...Shadow.small,
  },
  cardStale: { borderLeftWidth: 3, borderLeftColor: Colors.error },
  staleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.error + '12', borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, alignSelf: 'flex-start',
  },
  staleBannerText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: '600' },

  userHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  userInitial: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  userInitialText: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary },
  cardName: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cardTime: { fontSize: FontSize.xs, color: Colors.placeholder, marginTop: 2 },

  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  detailPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.background, borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  detailPillText: { fontSize: 11, color: Colors.textSecondary, maxWidth: 160 },

  idImage: { width: '100%', height: 200, borderRadius: BorderRadius.md, resizeMode: 'cover' },
  idImageHint: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.round,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  idImageHintText: { fontSize: 10, color: '#fff' },
  noIdImage: {
    height: 90, backgroundColor: Colors.border,
    borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  noIdText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  approveBtn: { flex: 1, backgroundColor: Colors.success },
  rejectBtn: { flex: 1, borderColor: Colors.error },

  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  escrowAmount: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.primary, flexShrink: 0 },
  refundBtn: { marginTop: Spacing.xs, borderColor: Colors.error },

  // Seed tab
  seedContainer: { padding: Spacing.lg, gap: Spacing.md, alignItems: 'center' },
  seedTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.primary },
  seedDesc: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22, textAlign: 'center' },
  seedItems: { width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  seedItemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  seedItemText: { fontSize: FontSize.sm, color: Colors.text },
  seedWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: '#FFF8E1', borderRadius: BorderRadius.md, padding: Spacing.md, width: '100%',
  },
  seedWarningText: { fontSize: FontSize.sm, color: Colors.warning, lineHeight: 20, flex: 1 },
  seedButton: { width: '100%', borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  seedButtonContent: { height: 52 },
  seedButtonLabel: { fontSize: FontSize.lg, fontWeight: 'bold' },

  // Image preview modal
  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewImage: { width: '95%', height: '75%' },
  previewClose: {
    position: 'absolute', top: 50, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Confirm dialog modal
  dialogOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  dialog: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, width: '100%', gap: Spacing.md, ...Shadow.medium,
  },
  dialogTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  dialogBody: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  dialogActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  dialogBtn: { flex: 1 },
});
