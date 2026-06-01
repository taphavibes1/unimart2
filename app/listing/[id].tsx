import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Button, Chip, ActivityIndicator, Avatar, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { Listing } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { LISTING_STATUSES, VERIFICATION_STATUSES, LISTING_CATEGORIES } from '../../constants';
import { formatPrice, timeAgo, generateId } from '../../lib/utils';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, firebaseUser } = useAuthStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'listings', id)).then((snap) => {
      if (snap.exists()) setListing({ id: snap.id, ...snap.data() } as Listing);
      setIsLoading(false);
    });
  }, [id]);

  const categoryLabel = LISTING_CATEGORIES.find((c) => c.id === listing?.category)?.label;

  const handleMessageSeller = async () => {
    if (!firebaseUser || !listing) {
      router.push('/(auth)/login');
      return;
    }
    if (firebaseUser.uid === listing.sellerId) {
      Toast.show({ type: 'info', text1: 'This is your listing' });
      return;
    }
    // Find or create chat
    const chatQuery = query(
      collection(db, 'chats'),
      where('listingId', '==', listing.id),
      where('buyerId', '==', firebaseUser.uid)
    );
    const existing = await getDocs(chatQuery);
    if (!existing.empty) {
      router.push(`/chat/${existing.docs[0].id}`);
      return;
    }
    const chatId = generateId();
    await setDoc(doc(db, 'chats', chatId), {
      listingId: listing.id,
      listingTitle: listing.title,
      listingImageUrl: listing.imageUrls?.[0] || '',
      buyerId: firebaseUser.uid,
      buyerName: user?.name || 'Buyer',
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      lastMessage: 'Chat started',
      lastMessageTime: new Date().toISOString(),
      status: 'active',
    });
    router.push(`/chat/${chatId}`);
  };

  const handleBuyNow = () => {
    if (!firebaseUser) { router.push('/(auth)/login'); return; }
    if (user?.verificationStatus !== VERIFICATION_STATUSES.VERIFIED) {
      Toast.show({ type: 'error', text1: 'Verification Required', text2: 'Only verified students can purchase.' });
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
        <Text style={styles.notFoundText}>Listing not found</Text>
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
        }}
      />
      <ScrollView style={styles.container}>
        {/* Images */}
        <View style={styles.imageContainer}>
          {listing.imageUrls?.length > 0 ? (
            <>
              <Image
                source={{ uri: listing.imageUrls[activeImageIndex] }}
                style={styles.mainImage}
                resizeMode="cover"
              />
              {listing.imageUrls.length > 1 && (
                <View style={styles.imageDots}>
                  {listing.imageUrls.map((_, i) => (
                    <TouchableOpacity key={i} onPress={() => setActiveImageIndex(i)}>
                      <View style={[styles.dot, i === activeImageIndex && styles.dotActive]} />
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
              listing.status === LISTING_STATUSES.SOLD ? styles.overlayRed : styles.overlayOrange,
            ]}>
              <Text style={styles.statusOverlayText}>
                {listing.status === LISTING_STATUSES.SOLD ? 'SOLD' : 'RESERVED'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{listing.title}</Text>
            {categoryLabel && (
              <Chip compact style={styles.categoryChip} textStyle={styles.categoryChipText}>
                {categoryLabel}
              </Chip>
            )}
          </View>

          <Text style={styles.price}>{formatPrice(listing.price)}</Text>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{listing.locationLabel || 'UNIBEN Ugbowo'}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{timeAgo(listing.createdAt)}</Text>
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Seller</Text>
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
              <Text style={styles.sellerVerified}>✅ UNIBEN Verified Student</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {!isOwner && (
        <View style={styles.actionBar}>
          <Button
            mode="outlined"
            onPress={handleMessageSeller}
            style={styles.messageButton}
            contentStyle={styles.buttonContent}
            textColor={Colors.primary}
            icon="chat"
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
              Buy Now — {formatPrice(listing.price)}
            </Button>
          )}
        </View>
      )}

      {isOwner && (
        <View style={styles.actionBar}>
          <Text style={styles.ownerText}>This is your listing</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  notFoundEmoji: { fontSize: 56, marginBottom: Spacing.md },
  notFoundText: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  imageContainer: { position: 'relative', backgroundColor: Colors.border },
  mainImage: { width, height: 300 },
  imagePlaceholder: { width, height: 300, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.border },
  placeholderEmoji: { fontSize: 64 },
  imageDots: {
    position: 'absolute', bottom: 12,
    flexDirection: 'row', gap: 6,
    alignSelf: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.textOnPrimary, width: 20 },
  statusOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  overlayRed: { backgroundColor: 'rgba(176,0,32,0.6)' },
  overlayOrange: { backgroundColor: 'rgba(245,124,0,0.6)' },
  statusOverlayText: { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 4 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text, flex: 1, marginRight: Spacing.sm },
  categoryChip: { backgroundColor: Colors.primaryLight + '22' },
  categoryChipText: { fontSize: FontSize.xs, color: Colors.primary },
  price: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  metaText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  metaDot: { color: Colors.textSecondary },
  divider: { marginVertical: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text },
  description: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sellerAvatar: { backgroundColor: Colors.primary },
  sellerAvatarLabel: { color: Colors.textOnPrimary, fontWeight: 'bold' },
  sellerInfo: { gap: 4 },
  sellerName: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  sellerRating: { fontSize: FontSize.sm, color: Colors.textSecondary },
  sellerVerified: { fontSize: FontSize.sm, color: Colors.success },
  actionBar: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  messageButton: { flex: 1, borderColor: Colors.primary },
  buyButton: { flex: 2, backgroundColor: Colors.primary, borderRadius: BorderRadius.md },
  buttonContent: { height: 48 },
  buyButtonLabel: { fontWeight: 'bold' },
  ownerText: { flex: 1, textAlign: 'center', color: Colors.textSecondary, fontStyle: 'italic' },
});
