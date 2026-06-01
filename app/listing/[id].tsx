import { useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image,
  TouchableOpacity, Dimensions,
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
    Toast.show({
      type: 'success',
      text1: isSaved ? 'Removed from saved' : 'Saved!',
    });
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
        listing.id,
        listing.title,
        listing.imageUrls?.[0] || '',
        firebaseUser.uid,
        user?.name || 'Buyer',
        listing.sellerId,
        listing.sellerName
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
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
      <ScrollView style={styles.container}>
        {/* Image carousel */}
        <View style={styles.imageContainer}>
          {listing.imageUrls?.length > 0 ? (
            <>
              <Image
                source={{ uri: listing.imageUrls[activeImageIndex] }}
                style={styles.mainImage}
                resizeMode="cover"
              />
              {listing.imageUrls.length > 1 && (
                <View style={styles.thumbnails}>
                  {listing.imageUrls.map((uri, i) => (
                    <TouchableOpacity key={i} onPress={() => setActiveImageIndex(i)}>
                      <Image
                        source={{ uri }}
                        style={[styles.thumbnail, i === activeImageIndex && styles.thumbnailActive]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderEmoji}>📦</Text>
            </View>
          )}

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
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={3}>{listing.title}</Text>
            {categoryLabel && (
              <Chip compact style={styles.categoryChip} textStyle={styles.categoryChipText}>
                {categoryLabel}
              </Chip>
            )}
          </View>

          <Text style={styles.price}>{formatPrice(listing.price)}</Text>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{listing.locationLabel || 'UNIBEN Ugbowo'}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{timeAgo(listing.createdAt)}</Text>
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>

          <Divider style={styles.divider} />

          <Text style={styles.sectionLabel}>Seller</Text>
          <View style={styles.sellerRow}>
            <Avatar.Text
              size={44}
              label={listing.sellerName?.[0]?.toUpperCase() || '?'}
              style={styles.sellerAvatar}
              labelStyle={styles.sellerAvatarLabel}
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{listing.sellerName}</Text>
              {listing.sellerRating > 0 && (
                <Text style={styles.sellerRating}>⭐ {listing.sellerRating.toFixed(1)} rating</Text>
              )}
              <Text style={styles.sellerVerified}>✅ Verified UNIBEN Student</Text>
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
          {isAvailable && (
            <Button
              mode="contained"
              onPress={handleBuyNow}
              style={styles.buyButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buyButtonLabel}
            >
              Buy — {formatPrice(listing.price)}
            </Button>
          )}
          {!isAvailable && (
            <View style={styles.unavailableBox}>
              <Text style={styles.unavailableText}>
                {listing.status === LISTING_STATUSES.SOLD ? 'This item has been sold' : 'This item is reserved'}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.ownerBar}>
          <Text style={styles.ownerText}>📦 This is your listing</Text>
          <Button
            mode="text"
            onPress={() => router.push('/my-listings')}
            textColor={Colors.primary}
            compact
          >
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
  mainImage: { width, height: 300 },
  thumbnails: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.surface },
  thumbnail: { width: 64, height: 64, borderRadius: BorderRadius.sm, opacity: 0.6 },
  thumbnailActive: { opacity: 1, borderWidth: 2, borderColor: Colors.primary },
  imagePlaceholder: { width, height: 300, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 64 },
  statusOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  overlaySold: { backgroundColor: 'rgba(176,0,32,0.6)' },
  overlayReserved: { backgroundColor: 'rgba(245,124,0,0.6)' },
  statusOverlayText: { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 4 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text, flex: 1 },
  categoryChip: { backgroundColor: Colors.primaryLight + '22', flexShrink: 0 },
  categoryChipText: { fontSize: FontSize.xs, color: Colors.primary },
  price: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  metaText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  metaDot: { color: Colors.textSecondary },
  divider: { marginVertical: Spacing.sm },
  sectionLabel: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text },
  description: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sellerAvatar: { backgroundColor: Colors.primary },
  sellerAvatarLabel: { color: Colors.textOnPrimary, fontWeight: 'bold' },
  sellerInfo: { gap: 4 },
  sellerName: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  sellerRating: { fontSize: FontSize.sm, color: Colors.textSecondary },
  sellerVerified: { fontSize: FontSize.sm, color: Colors.success },
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
  unavailableBox: { flex: 2, alignItems: 'center' },
  unavailableText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  ownerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ownerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
