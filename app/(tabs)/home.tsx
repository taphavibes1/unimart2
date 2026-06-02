import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Image, ScrollView,
} from 'react-native';
import { Text, Searchbar, Chip, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { subscribeToAvailableListings } from '../../lib/firestore';
import { useAuthStore } from '../../store/authStore';
import { useListingStore } from '../../store/listingStore';
import { Listing } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { LISTING_CATEGORIES, LISTING_STATUSES, APP_NAME } from '../../constants';
import { formatPrice, timeAgo } from '../../lib/utils';
import VerificationBanner from '../../components/ui/VerificationBanner';

const CATEGORY_ICON: Record<string, string> = Object.fromEntries(
  LISTING_CATEGORIES.map((c) => [c.id, c.icon])
);

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const {
    listings, setListings,
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    isLoading, setLoading,
  } = useListingStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAvailableListings((data) => {
      setListings(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return listings.filter((l) => {
      if (selectedCategory && l.category !== selectedCategory) return false;
      if (q && !l.title.toLowerCase().includes(q) && !l.description?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [listings, selectedCategory, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.greeting}>
              {user ? `Hi, ${user.name.split(' ')[0]}! 👋` : 'Browse listings'}
            </Text>
          </View>
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
        <Searchbar
          placeholder="Search listings..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          icon="magnify"
        />
      </View>

      <VerificationBanner />

      {/* Category chips */}
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

      {/* Listing grid */}
      {isLoading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>
            {searchQuery || selectedCategory ? '🔍' : '🛒'}
          </Text>
          <Text style={styles.emptyTitle}>
            {searchQuery || selectedCategory ? 'No results' : 'No listings yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `Nothing matching "${searchQuery}"`
              : selectedCategory
              ? 'No listings in this category yet'
              : 'Be the first to list something!'}
          </Text>
          {(searchQuery || selectedCategory) && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { setSearchQuery(''); setSelectedCategory(null); }}
            >
              <Text style={styles.clearBtnText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          renderItem={({ item }) => <ListingCard listing={item} router={router} />}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function ListingCard({ listing, router }: { listing: Listing; router: any }) {
  const catIcon = CATEGORY_ICON[listing.category] ?? 'tag-outline';
  const isUnavailable = listing.status !== LISTING_STATUSES.AVAILABLE;

  return (
    <TouchableOpacity
      style={[styles.card, isUnavailable && styles.cardUnavailable]}
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.88}
    >
      <View style={styles.cardImageContainer}>
        {listing.imageUrls?.[0] ? (
          <Image
            source={{ uri: listing.imageUrls[0] }}
            style={[styles.cardImage, isUnavailable && styles.imageUnavailable]}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <MaterialCommunityIcons name={catIcon as any} size={36} color={Colors.border} />
          </View>
        )}

        {/* Category badge */}
        <View style={styles.catBadge}>
          <MaterialCommunityIcons name={catIcon as any} size={10} color={Colors.primary} />
        </View>

        {/* Status overlay */}
        {isUnavailable && (
          <View style={[
            styles.statusBadge,
            listing.status === LISTING_STATUSES.RESERVED ? styles.statusReserved : styles.statusSold,
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
            {listing.sellerRating > 0 ? `⭐ ${listing.sellerRating.toFixed(1)}  ` : ''}{listing.sellerName}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(listing.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={styles.skeletonImage} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { width: '90%' }]} />
        <View style={[styles.skeletonLine, { width: '55%', marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: '70%', marginTop: 6, height: 8 }]} />
      </View>
    </View>
  );
}

function SkeletonGrid() {
  return (
    <View style={styles.listContent}>
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={styles.row}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ))}
    </View>
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
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.md,
  },
  appName: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.accent },
  greeting: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  sellButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round, gap: 4,
  },
  sellButtonText: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.text },
  searchbar: { borderRadius: BorderRadius.lg, backgroundColor: Colors.surface },
  searchInput: { fontSize: FontSize.md },
  categoryScroll: { flexGrow: 0 },
  categoryContainer: { padding: Spacing.sm, gap: Spacing.sm, paddingVertical: Spacing.md },
  chip: { backgroundColor: Colors.surface },
  chipSelected: { backgroundColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.text },
  chipTextSelected: { color: Colors.textOnPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  clearBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round, borderWidth: 1, borderColor: Colors.primary,
  },
  clearBtnText: { color: Colors.primary, fontWeight: '600', fontSize: FontSize.sm },
  listContent: { padding: Spacing.sm, paddingBottom: Spacing.xxl },
  row: { justifyContent: 'space-between', paddingHorizontal: Spacing.xs, marginBottom: Spacing.sm },
  card: {
    width: '48%', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.small,
  },
  cardUnavailable: { opacity: 0.72 },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: 130, resizeMode: 'cover' },
  imageUnavailable: { opacity: 0.6 },
  cardImagePlaceholder: {
    width: '100%', height: 130,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  catBadge: {
    position: 'absolute', bottom: 6, left: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.small,
  },
  statusBadge: {
    position: 'absolute', top: 6, right: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.round,
  },
  statusReserved: { backgroundColor: Colors.statusReserved },
  statusSold: { backgroundColor: Colors.statusSold },
  statusText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  cardBody: { padding: Spacing.sm },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 4, lineHeight: 18 },
  cardPrice: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.primary, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSeller: { fontSize: 10, color: Colors.textSecondary, flex: 1 },
  cardTime: { fontSize: 10, color: Colors.placeholder },
  skeletonCard: { opacity: 1 },
  skeletonImage: { width: '100%', height: 130, backgroundColor: Colors.border },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: Colors.border },
});
