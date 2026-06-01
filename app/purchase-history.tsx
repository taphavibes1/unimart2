import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { Stack } from 'expo-router';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Payment } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { PAYMENT_STATUSES } from '../constants';
import { formatPrice, timeAgo } from '../lib/utils';

const statusConfig = {
  [PAYMENT_STATUSES.HELD]: { label: 'Held', color: Colors.warning },
  [PAYMENT_STATUSES.RELEASED]: { label: 'Completed', color: Colors.success },
  [PAYMENT_STATUSES.REFUNDED]: { label: 'Refunded', color: Colors.error },
};

export default function PurchaseHistoryScreen() {
  const { firebaseUser } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, 'payments'),
      where('buyerId', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
      setIsLoading(false);
    });
  }, [firebaseUser]);

  return (
    <>
      <Stack.Screen options={{ title: 'Purchase History', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.textOnPrimary }} />
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : payments.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>🛍️</Text>
            <Text style={styles.emptyTitle}>No purchases yet</Text>
            <Text style={styles.emptySubtitle}>Your completed purchases will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const config = statusConfig[item.status as keyof typeof statusConfig];
              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.listingTitle}</Text>
                    <Chip compact style={{ backgroundColor: config.color + '22' }} textStyle={{ color: config.color, fontSize: 11 }}>
                      {config.label}
                    </Chip>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Amount</Text>
                    <Text style={styles.cardValue}>{formatPrice(item.amount)}</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Fee</Text>
                    <Text style={styles.cardValue}>{formatPrice(item.fee)}</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Method</Text>
                    <Text style={styles.cardValue}>{item.paymentMethod}</Text>
                  </View>
                  <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  list: { padding: Spacing.md, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.xs, ...Shadow.small },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, flex: 1, marginRight: Spacing.sm },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cardValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  cardTime: { fontSize: FontSize.xs, color: Colors.placeholder, marginTop: Spacing.xs },
});
