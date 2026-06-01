import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Listing } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { formatPrice, timeAgo } from '../lib/utils';

export default function SavedItemsScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, 'listings'),
      where('savedBy', 'array-contains', firebaseUser.uid)
    );
    return onSnapshot(q, (snap) => {
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing)));
      setIsLoading(false);
    });
  }, [firebaseUser]);

  return (
    <>
      <Stack.Screen options={{ title: 'Saved Items', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.textOnPrimary }} />
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : listings.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>❤️</Text>
            <Text style={styles.emptyTitle}>No saved items</Text>
            <Text style={styles.emptySubtitle}>Tap the heart icon on any listing to save it here</Text>
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            numColumns={2}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                {item.imageUrls?.[0] ? (
                  <Image source={{ uri: item.imageUrls[0] }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Text style={styles.placeholderEmoji}>📦</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
                  <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
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
  emptyTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  list: { padding: Spacing.sm, paddingBottom: Spacing.xxl },
  row: { justifyContent: 'space-between', paddingHorizontal: Spacing.xs },
  card: { width: '48%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden', ...Shadow.small },
  image: { width: '100%', height: 120, resizeMode: 'cover' },
  imagePlaceholder: { backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 32 },
  cardBody: { padding: Spacing.sm, gap: 4 },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  cardPrice: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary },
  cardTime: { fontSize: 10, color: Colors.placeholder },
});
