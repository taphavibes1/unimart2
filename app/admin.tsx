import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import { Text, Button, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { User, Payment } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { VERIFICATION_STATUSES, PAYMENT_STATUSES, LISTING_STATUSES } from '../constants';
import { formatPrice, timeAgo } from '../lib/utils';

export default function AdminScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [heldPayments, setHeldPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'payments'>('users');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) return;

    const userQ = query(collection(db, 'users'), where('verificationStatus', '==', VERIFICATION_STATUSES.PENDING));
    const unsub1 = onSnapshot(userQ, (snap) => {
      setPendingUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
      setIsLoading(false);
    });

    const payQ = query(collection(db, 'payments'), where('status', '==', PAYMENT_STATUSES.HELD));
    const unsub2 = onSnapshot(payQ, (snap) => {
      setHeldPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
    });

    return () => { unsub1(); unsub2(); };
  }, [user]);

  const approveUser = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { verificationStatus: VERIFICATION_STATUSES.VERIFIED });
    Toast.show({ type: 'success', text1: 'User Verified', text2: 'Student has been approved.' });
  };

  const rejectUser = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { verificationStatus: VERIFICATION_STATUSES.REJECTED });
    Toast.show({ type: 'info', text1: 'User Rejected', text2: 'Student verification was denied.' });
  };

  const refundPayment = async (payment: Payment) => {
    await updateDoc(doc(db, 'payments', payment.id), {
      status: PAYMENT_STATUSES.REFUNDED,
      refundedAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, 'listings', payment.listingId), {
      status: LISTING_STATUSES.AVAILABLE,
    });
    Toast.show({ type: 'success', text1: 'Refunded', text2: 'Payment refunded and listing restored.' });
  };

  if (!user?.isAdmin) {
    return (
      <View style={styles.restricted}>
        <Text style={styles.restrictedEmoji}>🚫</Text>
        <Text style={styles.restrictedTitle}>Access Denied</Text>
        <Text style={styles.restrictedText}>Admin access only.</Text>
        <Button onPress={() => router.back()} textColor={Colors.primary}>Go Back</Button>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Admin Panel', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.textOnPrimary }} />
      <View style={styles.container}>
        <View style={styles.tabs}>
          <Chip
            selected={activeTab === 'users'}
            onPress={() => setActiveTab('users')}
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            textStyle={activeTab === 'users' ? styles.tabTextActive : styles.tabText}
          >
            Pending IDs ({pendingUsers.length})
          </Chip>
          <Chip
            selected={activeTab === 'payments'}
            onPress={() => setActiveTab('payments')}
            style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
            textStyle={activeTab === 'payments' ? styles.tabTextActive : styles.tabText}
          >
            Held Payments ({heldPayments.length})
          </Chip>
        </View>

        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : activeTab === 'users' ? (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyText}>No pending verifications</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.email} • {item.department}</Text>
                <Text style={styles.cardMeta}>ID: {item.studentIdNumber}</Text>
                <Text style={styles.cardTime}>Applied {timeAgo(item.createdAt)}</Text>
                {item.studentIdImageUrl ? (
                  <Image source={{ uri: item.studentIdImageUrl }} style={styles.idImage} />
                ) : (
                  <View style={styles.noImage}><Text style={styles.noImageText}>No ID image</Text></View>
                )}
                <View style={styles.cardActions}>
                  <Button
                    mode="contained"
                    onPress={() => approveUser(item.id)}
                    style={styles.approveBtn}
                    labelStyle={styles.approveBtnLabel}
                    icon="check"
                  >
                    Approve
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => rejectUser(item.id)}
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
        ) : (
          <FlatList
            data={heldPayments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>💰</Text>
                <Text style={styles.emptyText}>No held payments</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardName}>{item.listingTitle}</Text>
                <Text style={styles.cardMeta}>Amount: {formatPrice(item.amount)} + {formatPrice(item.fee)} fee</Text>
                <Text style={styles.cardMeta}>Method: {item.paymentMethod}</Text>
                <Text style={styles.cardTime}>Created {timeAgo(item.createdAt)}</Text>
                <Button
                  mode="outlined"
                  onPress={() => refundPayment(item)}
                  style={styles.refundBtn}
                  textColor={Colors.error}
                  icon="undo"
                >
                  Issue Refund
                </Button>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  restrictedEmoji: { fontSize: 56 },
  restrictedTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text },
  restrictedText: { fontSize: FontSize.md, color: Colors.textSecondary },
  tabs: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, backgroundColor: Colors.background },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.text },
  tabTextActive: { color: Colors.textOnPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.md, gap: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: FontSize.lg, color: Colors.textSecondary },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.xs, ...Shadow.small },
  cardName: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cardTime: { fontSize: FontSize.xs, color: Colors.placeholder },
  idImage: { width: '100%', height: 180, borderRadius: BorderRadius.md, resizeMode: 'cover', marginTop: Spacing.sm },
  noImage: { height: 100, backgroundColor: Colors.border, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  noImageText: { color: Colors.textSecondary },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  approveBtn: { flex: 1, backgroundColor: Colors.success },
  approveBtnLabel: { color: '#fff' },
  rejectBtn: { flex: 1, borderColor: Colors.error },
  refundBtn: { marginTop: Spacing.sm, borderColor: Colors.error },
});
