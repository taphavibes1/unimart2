import { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Image, ScrollView,
} from 'react-native';
import { Text, Searchbar, Chip, Badge, ActivityIndicator, Banner } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useListingStore } from '../../store/listingStore';
import { Listing } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { LISTING_CATEGORIES, LISTING_STATUSES, APP_NAME, VERIFICATION_STATUSES } from '../../constants';
import { formatPrice, timeAgo } from '../../lib/utils';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { listings, setListings, selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, isLoading, setLoading } = useListingStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'listings'),
      where('status', '==', LISTING_STATUSES.AVAILABLE),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
      setListings(data);
      setLoading(false);
    }, (err) => {
      console.error('Listings error:', err);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filtered = listings.filter((l) => {
    const matchCat = !selectedCategory || l.category === selectedCategory;
    const matchSearch = !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const isPending = user?.verificationStatus === VERIFICATION_STATUSES.PENDING;
  const isRejected = user?.verificationStatus === VERIFICATION_STATUSES.REJECTED;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.greeting}>
              {user ? `Hi, ${user.name.split(' ')[0]}! 👋` : 'Browse listings'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {user && (
              <TouchableOpacity
                onPress={() => router.push('/create-listing')}
                style={styles.sellButton}
              >
                <MaterialCommunityIcons name="plus" size={18} color={Colors.text} />
                <Text style={styles.sellButtonText}>Sell</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Searchbar
          placeholder="Search listings..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
      </View>

      {isPending && (
        <Banner
          visible
          icon="clock-outline"
          style={styles.pendingBanner}
          actions={[]}
        >
          <Text style={styles.bannerText}>
            Your student ID is pending verification. You can browse but cannot create listings or use checkout.
          </Text>
        </Banner>
      )}

      {isRejected && (
        <Banner
          visible
          icon="alert-circle"
          style={styles.rejectedBanner}
          actions={[]}
        >
          <Text style={styles.bannerText}>
            Your ID verification was rejected. Please contact support or re-register.
          </Text>
        </Banner>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <Chip
          selected={!selectedCategory}
          onPress={() => setSelectedCategory(null)}
          style={[styles.chip, !selectedCategory && styles.chipSelected]}
          textStyle={[styles.chipText, !selectedCategory && styles.chipTextSelected]}
        >
          All
        </Chip>
        {LISTING_CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            selected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            style={[styles.chip, selectedCategory === cat.id && styles.chipSelected]}
            textStyle={[styles.chipText, selectedCategory === cat.id && styles.chipTextSelected]}
            icon={cat.icon as any}
          >
            {cat.label}
          </Chip>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>No listings found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || selectedCategory
              ? 'Try a different search or category'
              : 'Be the first to list something!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => <ListingCard listing={item} router={router} />}
        />
      )}
    </View>
  );
}

function ListingCard({ listing, router }: { listing: Listing; router: any }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageContainer}>
        {listing.imageUrls?.[0] ? (
          <Image source={{ uri: listing.imageUrls[0] }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderEmoji}>📦</Text>
          </View>
        )}
        {listing.status !== LISTING_STATUSES.AVAILABLE && (
          <View style={[
            styles.statusBadge,
            listing.status === LISTING_STATUSES.RESERVED && styles.statusReserved,
            listing.status === LISTING_STATUSES.SOLD && styles.statusSold,
          ]}>
            <Text style={styles.statusText}>
              {listing.status === LISTING_STATUSES.RESERVED ? 'Reserved' : 'Sold'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.cardPrice}>{formatPrice(listing.price)}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardSeller} numberOfLines={1}>
            {listing.sellerName}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(listing.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    paddingTop: Spacing.xl + Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  appName: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.accent },
  greeting: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  sellButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    gap: 4,
  },
  sellButtonText: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.text },
  searchbar: { borderRadius: BorderRadius.lg, backgroundColor: Colors.surface },
  searchInput: { fontSize: FontSize.md },
  pendingBanner: { backgroundColor: '#FFF8E1' },
  rejectedBanner: { backgroundColor: '#FFEBEE' },
  bannerText: { fontSize: FontSize.sm, color: Colors.text },
  categoryScroll: { flexGrow: 0 },
  categoryContainer: { padding: Spacing.sm, gap: Spacing.sm, paddingVertical: Spacing.md },
  chip: { backgroundColor: Colors.surface },
  chipSelected: { backgroundColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.text },
  chipTextSelected: { color: Colors.textOnPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { marginTop: Spacing.md, color: Colors.textSecondary },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  listContent: { padding: Spacing.sm, paddingBottom: Spacing.xxl },
  row: { justifyContent: 'space-between', paddingHorizontal: Spacing.xs },
  card: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.small,
  },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: 130, resizeMode: 'cover' },
  cardImagePlaceholder: {
    width: '100%', height: 130,
    backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 36 },
  statusBadge: {
    position: 'absolute', top: 6, right: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.statusReserved,
  },
  statusReserved: { backgroundColor: Colors.statusReserved },
  statusSold: { backgroundColor: Colors.statusSold },
  statusText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  cardBody: { padding: Spacing.sm },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  cardPrice: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.primary, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSeller: { fontSize: 10, color: Colors.textSecondary, flex: 1 },
  cardTime: { fontSize: 10, color: Colors.placeholder },
});
