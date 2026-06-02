import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image,
  TouchableOpacity, Dimensions, FlatList,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Text, Button, Chip, ActivityIndicator, Avatar, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  getListing, getOrCreateChat, toggleSaveListing,
} from '../../lib/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Listing } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { LISTING_STATUSES, VERIFICATION_STATUSES, LISTING_CATEGORIES } from '../../constants';
import { formatPrice, timeAgo } from '../../lib/utils';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 300;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, firebaseUser, isVerified } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const carouselRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    getListing(id).then((l) => {
      setListing(l);
      setIsLoading(false);
      if (l && firebaseUser) {
        setIsSaved(l.savedBy?.includes(firebaseUser.uid) ?? false);
      }
    });
  }, [id]);

  const categoryLabel = LISTING_CATEGORIES.find((c) => c.id === listing?.category)?.label;

  const handleToggleSave = async () => {
    if (!firebaseUser || !listing) { router.push('/(auth)/login'); return; }
    setSavingToggle(true);
    await toggleSaveListing(listing.id, firebaseUser.uid, isSaved);
    setIsSaved(!isSaved);
    setSavingToggle(false);
    Toast.show({ type: 'success', text1: isSaved ? 'Removed from saved' : '❤️ Saved!' });
  };

  const handleMessageSeller = async () => {
    if (!firebaseUser || !listing) { router.push('/(auth)/login'); return; }
    if (firebaseUser.uid === listing.sellerId) {
      Toast.show({ type: 'info', text1: 'This is your listing' });
      return;
    }
    setStartingChat(true);
    try {
      const chatId = await getOrCreateChat(
        listing.id, listing.title, listing.imageUrls?.[0] || '',
        firebaseUser.uid, user?.name || 'Buyer',
        listing.sellerId, listing.sellerName
      );
      router.push(`/chat/${chatId}`);
    } finally {
      setStartingChat(false);
    }
  };

  const handleBuyNow = () => {
    if (!firebaseUser) { router.push('/(auth)/login'); return; }
    if (!isVerified) {
      Toast.show({
        type: 'error',
        text1: 'Verification Required',
        text2: 'Only verified students can purchase items.',
      });
      return;
    }
    router.push(`/checkout/${listing?.id}`);
  };

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(idx);
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  if (!listing) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundEmoji}>🔍</Text>
        <Text style={styles.notFoundTitle}>Listing not found</Text>
        <Button onPress={() => router.back()} textColor={Colors.primary}>Go Back</Button>
      </View>
    );
  }

  const isOwner = firebaseUser?.uid === listing.sellerId;
  const isAvailable = listing.status === LISTING_STATUSES.AVAILABLE;
  const images = listing.imageUrls?.length ? listing.imageUrls : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: listing.title,
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.textOnPrimary,
          headerRight: () =>
            firebaseUser && !isOwner ? (
              <TouchableOpacity onPress={handleToggleSave} disabled={savingToggle} style={styles.saveBtn}>
                <MaterialCommunityIcons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isSaved ? '#FF5252' : Colors.textOnPrimary}
                />
              </TouchableOpacity>
            ) : null,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Image carousel */}
        <View style={styles.imageContainer}>
          {images ? (
            <>
              <FlatList
                ref={carouselRef}
                data={images}
                keyExtractor={(_, i) => i.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onCarouselScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={styles.mainImage} resizeMode="cover" />
                )}
              />
              {images.length > 1 && (
                <View style={styles.dotRow}>
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeImageIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderEmoji}>📦</Text>
            </View>
          )}

          {/* Status overlay */}
          {listing.status !== LISTING_STATUSES.AVAILABLE && (
            <View style={[
              styles.statusOverlay,
              listing.status === LISTING_STATUSES.SOLD ? styles.overlaySold : styles.overlayReserved,
            ]}>
              <Text style={styles.statusOverlayText}>
                {listing.status === LISTING_STATUSES.SOLD ? 'SOLD' : 'RESERVED'}
              </Text>
            </View>
          )}

          {/* Image count badge */}
          {images && images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <MaterialCommunityIcons name="image-multiple" size={12} color="#fff" />
              <Text style={styles.imageCountText}>{activeImageIndex + 1}/{images.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title + category */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={3}>{listing.title}</Text>
            {categoryLabel && (
              <Chip compact style={styles.categoryChip} textStyle={styles.categoryChipText}>
                {categoryLabel}
              </Chip>
            )}
          </View>

          {/* Price */}
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>

          {/* Meta */}
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{listing.locationLabel || 'UNIBEN Ugbowo'}</Text>
            <Text style={styles.metaDot}>·</Text>
            <MaterialCommunityIcons name="clock-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{timeAgo(listing.createdAt)}</Text>
          </View>

          <Divider style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>

          <Divider style={styles.divider} />

          {/* Seller */}
          <Text style={styles.sectionLabel}>Seller</Text>
          <View style={styles.sellerCard}>
            <Avatar.Text
              size={46}
              label={listing.sellerName?.[0]?.toUpperCase() || '?'}
              style={styles.sellerAvatar}
              labelStyle={styles.sellerAvatarLabel}
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{listing.sellerName}</Text>
              {listing.sellerRating > 0 && (
                <View style={styles.ratingRow}>
                  {[1,2,3,4,5].map((s) => (
                    <MaterialCommunityIcons
                      key={s}
                      name={s <= Math.round(listing.sellerRating) ? 'star' : 'star-outline'}
                      size={14}
                      color={Colors.warning}
                    />
                  ))}
                  <Text style={styles.ratingNum}>{listing.sellerRating.toFixed(1)}</Text>
                </View>
              )}
              <View style={styles.verifiedRow}>
                <MaterialCommunityIcons name="check-decagram" size={14} color={Colors.success} />
                <Text style={styles.sellerVerified}>Verified UNIBEN Student</Text>
              </View>
            </View>
            {!isOwner && firebaseUser && (
              <TouchableOpacity onPress={handleMessageSeller} style={styles.sellerMessageBtn}>
                <MaterialCommunityIcons name="chat-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Escrow trust badge */}
          <View style={styles.escrowBadge}>
            <MaterialCommunityIcons name="shield-lock" size={18} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.escrowBadgeTitle}>Protected by Escrow</Text>
              <Text style={styles.escrowBadgeDesc}>
                Payment is held safely until you receive and inspect the item
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action bar */}
      {!isOwner ? (
        <View style={styles.actionBar}>
          <Button
            mode="outlined"
            onPress={handleMessageSeller}
            loading={startingChat}
            disabled={startingChat}
            style={styles.messageButton}
            contentStyle={styles.buttonContent}
            textColor={Colors.primary}
            icon="chat-outline"
          >
            Message
          </Button>
          {isAvailable ? (
            <Button
              mode="contained"
              onPress={handleBuyNow}
              style={styles.buyButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buyButtonLabel}
              icon="lock"
            >
              Buy — {formatPrice(listing.price)}
            </Button>
          ) : (
            <View style={styles.unavailableBox}>
              <MaterialCommunityIcons
                name={listing.status === LISTING_STATUSES.SOLD ? 'check-circle' : 'clock-outline'}
                size={16}
                color={listing.status === LISTING_STATUSES.SOLD ? Colors.error : Colors.warning}
              />
              <Text style={styles.unavailableText}>
                {listing.status === LISTING_STATUSES.SOLD ? 'Sold' : 'Reserved'}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.ownerBar}>
          <Text style={styles.ownerText}>📦 Your listing</Text>
          <Button mode="text" onPress={() => router.push('/my-listings')} textColor={Colors.primary} compact>
            Manage →
          </Button>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  notFoundEmoji: { fontSize: 56, marginBottom: Spacing.md },
  notFoundTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  saveBtn: { padding: Spacing.sm },

  imageContainer: { position: 'relative', backgroundColor: Colors.border },
  mainImage: { width, height: IMAGE_HEIGHT },
  imagePlaceholder: { width, height: IMAGE_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 64 },

  dotRow: {
    position: 'absolute', bottom: Spacing.sm, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 18 },

  imageCountBadge: {
    position: 'absolute', top: Spacing.sm, right: Spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.round,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  imageCountText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  statusOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  overlaySold: { backgroundColor: 'rgba(176,0,32,0.6)' },
  overlayReserved: { backgroundColor: 'rgba(245,124,0,0.6)' },
  statusOverlayText: { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 4 },

  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text, flex: 1 },
  categoryChip: { backgroundColor: Colors.primaryLight + '22', flexShrink: 0 },
  categoryChipText: { fontSize: FontSize.xs, color: Colors.primary },
  price: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  metaDot: { color: Colors.placeholder, marginHorizontal: 2 },
  divider: { marginVertical: Spacing.sm },
  sectionLabel: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, marginBottom: 2 },
  description: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },

  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, ...Shadow.small,
  },
  sellerAvatar: { backgroundColor: Colors.primary },
  sellerAvatarLabel: { color: Colors.textOnPrimary, fontWeight: 'bold' },
  sellerInfo: { flex: 1, gap: 3 },
  sellerName: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingNum: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: 2 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerVerified: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  sellerMessageBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center',
  },

  escrowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary + '0F', borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '22',
  },
  escrowBadgeTitle: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.primary },
  escrowBadgeDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },

  actionBar: {
    flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    alignItems: 'center',
  },
  messageButton: { flex: 1, borderColor: Colors.primary },
  buyButton: { flex: 2, backgroundColor: Colors.primary, borderRadius: BorderRadius.md },
  buttonContent: { height: 48 },
  buyButtonLabel: { fontWeight: 'bold' },
  unavailableBox: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  unavailableText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  ownerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ownerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
