import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { Stack } from 'expo-router';
import { subscribeToBuyerPayments } from '../lib/firestore';
import { useAuth } from '../hooks/useAuth';
import { Payment } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { PAYMENT_STATUSES } from '../constants';
import { formatPrice, timeAgo } from '../lib/utils';

const STATUS_CONFIG = {
  [PAYMENT_STATUSES.HELD]: { label: 'Awaiting Meetup', color: Colors.warning },
  [PAYMENT_STATUSES.RELEASED]: { label: 'Completed', color: Colors.success },
  [PAYMENT_STATUSES.REFUNDED]: { label: 'Refunded', color: Colors.error },
};

export default function PurchaseHistoryScreen() {
  const { firebaseUser } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToBuyerPayments(firebaseUser.uid, (data) => {
      setPayments(data);
      setIsLoading(false);
    });
  }, [firebaseUser]);

  return (
    <>
      <Stack.Screen options={{
        title: 'Purchase History',
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
      }} />
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
              const config = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.listingTitle}</Text>
                    <Chip
                      compact
                      style={{ backgroundColor: config.color + '22' }}
                      textStyle={{ color: config.color, fontSize: 11, fontWeight: 'bold' }}
                    >
                      {config.label}
                    </Chip>
                  </View>
                  {[
                    ['Item Price', formatPrice(item.amount)],
                    ['Platform Fee', formatPrice(item.fee)],
                    ['Total Paid', formatPrice(item.totalAmount)],
                    ['Method', item.paymentMethod],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.row}>
                      <Text style={styles.rowLabel}>{label}</Text>
                      <Text style={styles.rowValue}>{value}</Text>
                    </View>
                  ))}
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
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, ...Shadow.small },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs, gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  rowValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  cardTime: { fontSize: FontSize.xs, color: Colors.placeholder, marginTop: Spacing.xs },
});
