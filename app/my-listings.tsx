import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Chip, ActivityIndicator, Button, FAB } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeToSellerListings, updateListingStatus } from '../lib/firestore';
import { useAuth } from '../hooks/useAuth';
import { Listing } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { LISTING_STATUSES } from '../constants';
import { formatPrice, timeAgo } from '../lib/utils';

const STATUS_COLOR: Record<string, string> = {
  available: Colors.statusAvailable,
  reserved: Colors.statusReserved,
  sold: Colors.statusSold,
};

const STATUS_LABEL: Record<string, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
};

export default function MyListingsScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reservedPaymentIds, setReservedPaymentIds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToSellerListings(firebaseUser.uid, (data) => {
      setListings(data);
      setIsLoading(false);
    });
  }, [firebaseUser]);

  // Fetch paymentIds for reserved listings so seller can show their QR
  useEffect(() => {
    const reserved = listings.filter((l) => l.status === LISTING_STATUSES.RESERVED);
    if (!reserved.length || !firebaseUser) return;

    Promise.all(
      reserved.map(async (l) => {
        const q = query(
          collection(db, 'payments'),
          where('listingId', '==', l.id),
          where('status', '==', 'held'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) return [l.id, snap.docs[0].id] as [string, string];
        return null;
      })
    ).then((results) => {
      const map: Record<string, string> = {};
      for (const r of results) if (r) map[r[0]] = r[1];
      setReservedPaymentIds(map);
    });
  }, [listings, firebaseUser]);

  const stats = useMemo(() => ({
    total: listings.length,
    available: listings.filter((l) => l.status === LISTING_STATUSES.AVAILABLE).length,
    reserved: listings.filter((l) => l.status === LISTING_STATUSES.RESERVED).length,
    sold: listings.filter((l) => l.status === LISTING_STATUSES.SOLD).length,
    totalValue: listings
      .filter((l) => l.status === LISTING_STATUSES.AVAILABLE)
      .reduce((sum, l) => sum + l.price, 0),
  }), [listings]);

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
            <Text style={styles.emptySubtitle}>Tap + to post your first item</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/create-listing')}
              style={styles.createButton}
              icon="plus"
            >
              Create Listing
            </Button>
          </View>
        ) : (
          <>
            {/* Summary bar */}
            <View style={styles.summaryBar}>
              <SummaryPill label="Active" count={stats.available} color={Colors.statusAvailable} />
              <SummaryPill label="Reserved" count={stats.reserved} color={Colors.statusReserved} />
              <SummaryPill label="Sold" count={stats.sold} color={Colors.statusSold} />
              {stats.totalValue > 0 && (
                <View style={styles.inventoryValue}>
                  <Text style={styles.inventoryValueText}>{formatPrice(stats.totalValue)}</Text>
                  <Text style={styles.inventoryValueLabel}>inventory</Text>
                </View>
              )}
            </View>

            <FlatList
              data={listings}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ListingCard
                  item={item}
                  paymentId={reservedPaymentIds[item.id]}
                  onPress={() => router.push(`/listing/${item.id}`)}
                  onMarkSold={async () => {
                    await updateListingStatus(item.id, LISTING_STATUSES.SOLD);
                    Toast.show({ type: 'success', text1: 'Marked as Sold' });
                  }}
                  onRelist={async () => {
                    await updateListingStatus(item.id, LISTING_STATUSES.AVAILABLE);
                    Toast.show({ type: 'success', text1: 'Relisted!' });
                  }}
                  onShowQR={() => router.push(`/seller-qr?paymentId=${reservedPaymentIds[item.id]}`)}
                />
              )}
            />
          </>
        )}

        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => router.push('/create-listing')}
          color={Colors.textOnPrimary}
        />
      </View>
    </>
  );
}

function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillCount, { color }]}>{count}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function ListingCard({
  item, paymentId, onPress, onMarkSold, onRelist, onShowQR,
}: {
  item: Listing;
  paymentId?: string;
  onPress: () => void;
  onMarkSold: () => void;
  onRelist: () => void;
  onShowQR: () => void;
}) {
  const color = STATUS_COLOR[item.status] || Colors.textSecondary;
  const label = STATUS_LABEL[item.status] || item.status;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {item.imageUrls?.[0] ? (
        <Image source={{ uri: item.imageUrls[0] }} style={styles.thumbImg} />
      ) : (
        <View style={[styles.thumbImg, styles.thumbPlaceholder]}>
          <Text style={styles.thumbEmoji}>📦</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{label}</Text>
          <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <View style={styles.actions}>
          {item.status === LISTING_STATUSES.RESERVED && paymentId && (
            <TouchableOpacity style={styles.qrAction} onPress={onShowQR}>
              <MaterialCommunityIcons name="qrcode" size={14} color={Colors.primary} />
              <Text style={styles.qrActionText}>Show QR</Text>
            </TouchableOpacity>
          )}
          {item.status !== LISTING_STATUSES.SOLD && (
            <Button compact mode="text" textColor={Colors.error} onPress={onMarkSold}>
              Mark Sold
            </Button>
          )}
          {item.status === LISTING_STATUSES.SOLD && (
            <Button compact mode="text" textColor={Colors.primary} onPress={onRelist}>
              Relist
            </Button>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary },
  createButton: { marginTop: Spacing.sm, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },

  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md,
  },
  pill: { alignItems: 'center', minWidth: 44 },
  pillCount: { fontSize: FontSize.lg, fontWeight: 'bold' },
  pillLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  inventoryValue: { marginLeft: 'auto' as any, alignItems: 'flex-end' },
  inventoryValueText: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary },
  inventoryValueLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },

  list: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 80 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.small,
  },
  thumbImg: { width: 90, height: 90, resizeMode: 'cover' as any },
  thumbPlaceholder: { backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 28 },
  cardBody: { flex: 1, padding: Spacing.sm, gap: 4 },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  cardPrice: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.primary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: FontSize.xs, fontWeight: '600', flex: 1 },
  cardTime: { fontSize: FontSize.xs, color: Colors.placeholder },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: -4 },
  qrAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.sm, backgroundColor: Colors.primary + '12',
    marginRight: Spacing.xs,
  },
  qrActionText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  fab: {
    position: 'absolute', right: Spacing.md, bottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
});
