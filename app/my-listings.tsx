import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import { subscribeToSellerListings, updateListingStatus } from '../lib/firestore';
import { useAuth } from '../hooks/useAuth';
import { Listing } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { LISTING_STATUSES } from '../constants';
import { formatPrice, timeAgo } from '../lib/utils';

export default function MyListingsScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToSellerListings(firebaseUser.uid, (data) => {
      setListings(data);
      setIsLoading(false);
    });
  }, [firebaseUser]);

  const statusColor = (s: string) =>
    ({ available: Colors.statusAvailable, reserved: Colors.statusReserved, sold: Colors.statusSold }[s] || Colors.textSecondary);

  return (
    <>
      <Stack.Screen options={{
        title: 'My Listings',
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
      }} />
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : listings.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Button onPress={() => router.push('/create-listing')} textColor={Colors.primary}>
              Create Your First Listing
            </Button>
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/listing/${item.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.thumb}>
                  {item.imageUrls?.[0] ? (
                    <Image source={{ uri: item.imageUrls[0] }} style={styles.thumbImg} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={styles.thumbEmoji}>📦</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
                  <View style={styles.cardMeta}>
                    <Chip
                      compact
                      style={{ backgroundColor: statusColor(item.status) + '22', height: 24 }}
                      textStyle={{ color: statusColor(item.status), fontSize: 11, fontWeight: 'bold' }}
                    >
                      {item.status}
                    </Chip>
                    <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  <View style={styles.actions}>
                    {item.status !== LISTING_STATUSES.SOLD && (
                      <Button
                        compact mode="text" textColor={Colors.error}
                        onPress={async () => {
                          await updateListingStatus(item.id, LISTING_STATUSES.SOLD);
                          Toast.show({ type: 'success', text1: 'Marked as Sold' });
                        }}
                      >
                        Mark Sold
                      </Button>
                    )}
                    {item.status === LISTING_STATUSES.SOLD && (
                      <Button
                        compact mode="text" textColor={Colors.primary}
                        onPress={async () => {
                          await updateListingStatus(item.id, LISTING_STATUSES.AVAILABLE);
                          Toast.show({ type: 'success', text1: 'Relisted!' });
                        }}
                      >
                        Relist
                      </Button>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
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
  emptyTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  list: { padding: Spacing.md, gap: Spacing.md },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.small,
  },
  thumb: { width: 90 },
  thumbImg: { width: 90, height: 90, resizeMode: 'cover' },
  thumbPlaceholder: { width: 90, height: 90, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 28 },
  cardBody: { flex: 1, padding: Spacing.sm, gap: 4 },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  cardPrice: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.primary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTime: { fontSize: FontSize.xs, color: Colors.placeholder },
  actions: { flexDirection: 'row', marginTop: -4 },
});
