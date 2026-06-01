import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { Chat } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { timeAgo } from '../../lib/utils';

export default function ChatsScreen() {
  const router = useRouter();
  const { user, firebaseUser } = useAuthStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) { setIsLoading(false); return; }

    const buyerQ = query(
      collection(db, 'chats'),
      where('buyerId', '==', firebaseUser.uid),
      orderBy('lastMessageTime', 'desc')
    );
    const sellerQ = query(
      collection(db, 'chats'),
      where('sellerId', '==', firebaseUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const allChats = new Map<string, Chat>();
    let loaded = 0;

    const merge = () => {
      const sorted = Array.from(allChats.values()).sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      setChats(sorted);
    };

    const unsub1 = onSnapshot(buyerQ, (snap) => {
      snap.docs.forEach((d) => allChats.set(d.id, { id: d.id, ...d.data() } as Chat));
      loaded++;
      if (loaded >= 2) setIsLoading(false);
      merge();
    });

    const unsub2 = onSnapshot(sellerQ, (snap) => {
      snap.docs.forEach((d) => allChats.set(d.id, { id: d.id, ...d.data() } as Chat));
      loaded++;
      if (loaded >= 2) setIsLoading(false);
      merge();
    });

    return () => { unsub1(); unsub2(); };
  }, [firebaseUser]);

  if (!firebaseUser) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authEmoji}>💬</Text>
        <Text style={styles.authTitle}>Sign in to access chats</Text>
        <Text style={styles.authSubtitle}>Chat with sellers and negotiate prices</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>{chats.length} conversation{chats.length !== 1 ? 's' : ''}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>Start chatting by tapping "Message Seller" on any listing</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              currentUserId={firebaseUser.uid}
              onPress={() => router.push(`/chat/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

function ChatListItem({
  chat,
  currentUserId,
  onPress,
}: {
  chat: Chat;
  currentUserId: string;
  onPress: () => void;
}) {
  const isBuyer = chat.buyerId === currentUserId;
  const otherName = isBuyer ? chat.sellerName : chat.buyerName;
  const initial = otherName?.[0]?.toUpperCase() || '?';

  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress} activeOpacity={0.8}>
      <Avatar.Text
        size={50}
        label={initial}
        style={styles.avatar}
        labelStyle={styles.avatarLabel}
      />
      <View style={styles.chatBody}>
        <View style={styles.chatTop}>
          <Text style={styles.chatName} numberOfLines={1}>{otherName}</Text>
          <Text style={styles.chatTime}>{timeAgo(chat.lastMessageTime)}</Text>
        </View>
        <Text style={styles.chatListing} numberOfLines={1}>
          re: {chat.listingTitle}
        </Text>
        <Text style={styles.chatLastMessage} numberOfLines={1}>
          {chat.lastMessage}
        </Text>
        {chat.status === 'offer_accepted' && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>✓ Offer Accepted</Text>
          </View>
        )}
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
  headerTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.textOnPrimary },
  headerSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  authContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  authEmoji: { fontSize: 56, marginBottom: Spacing.md },
  authTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  authSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  avatar: { backgroundColor: Colors.primaryLight },
  avatarLabel: { color: Colors.textOnPrimary, fontWeight: 'bold' },
  chatBody: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  chatName: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, flex: 1 },
  chatTime: { fontSize: FontSize.xs, color: Colors.textSecondary },
  chatListing: { fontSize: FontSize.xs, color: Colors.primary, marginBottom: 2 },
  chatLastMessage: { fontSize: FontSize.sm, color: Colors.textSecondary },
  offerBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
  },
  offerBadgeText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: 'bold' },
});
