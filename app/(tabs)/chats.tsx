import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { subscribeToUserChats } from '../../lib/firestore';
import { useAuthStore } from '../../store/authStore';
import { Chat } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { timeAgo } from '../../lib/utils';

export default function ChatsScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuthStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) { setIsLoading(false); return; }
    const unsub = subscribeToUserChats(firebaseUser.uid, (data) => {
      setChats(data);
      setIsLoading(false);
    });
    return unsub;
  }, [firebaseUser]);

  if (!firebaseUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Sign in to access chats</Text>
          <Text style={styles.emptySubtitle}>Chat with sellers and negotiate prices</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {!isLoading && chats.length > 0 && (
          <Text style={styles.headerSubtitle}>
            {chats.length} conversation{chats.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {isLoading ? (
        <SkeletonList />
      ) : chats.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Message Seller" on any listing to start chatting
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
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
  chat, currentUserId, onPress,
}: {
  chat: Chat; currentUserId: string; onPress: () => void;
}) {
  const isBuyer = chat.buyerId === currentUserId;
  const otherName = isBuyer ? chat.sellerName : chat.buyerName;
  const initial = otherName?.[0]?.toUpperCase() || '?';
  const isOfferAccepted = chat.status === 'offer_accepted';

  return (
    <TouchableOpacity
      style={[styles.chatItem, isOfferAccepted && styles.chatItemAccepted]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.avatarWrap}>
        <Avatar.Text size={48} label={initial} style={styles.avatar} labelStyle={styles.avatarLabel} />
        {isOfferAccepted && <View style={styles.acceptedDot} />}
      </View>

      <View style={styles.chatBody}>
        <View style={styles.chatTop}>
          <Text style={styles.chatName} numberOfLines={1}>{otherName}</Text>
          <Text style={styles.chatTime}>{timeAgo(chat.lastMessageTime)}</Text>
        </View>
        <Text style={styles.chatListing} numberOfLines={1}>📦 {chat.listingTitle}</Text>
        <Text style={[styles.chatLastMsg, isOfferAccepted && styles.chatLastMsgAccepted]} numberOfLines={1}>
          {chat.lastMessage}
        </Text>
        {isOfferAccepted && (
          <View style={[styles.offerBadge, isBuyer && styles.offerBadgeBuyer]}>
            <Text style={[styles.offerBadgeText, isBuyer && { color: Colors.primary }]}>
              {isBuyer ? '✓ Offer accepted — tap to pay →' : '✓ Offer accepted — awaiting payment'}
            </Text>
          </View>
        )}
      </View>

      {chat.listingImageUrl ? (
        <Image source={{ uri: chat.listingImageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderText}>📦</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.chatItem}>
      <View style={styles.skeletonCircle} />
      <View style={styles.chatBody}>
        <View style={[styles.skeletonLine, { width: '50%', marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '80%', marginBottom: 6 }]} />
        <View style={[styles.skeletonLine, { width: '65%', height: 10 }]} />
      </View>
      <View style={[styles.thumb, { backgroundColor: Colors.border }]} />
    </View>
  );
}

function SkeletonList() {
  return <>{[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}</>;
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
  headerSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  chatItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  chatItemAccepted: { backgroundColor: '#F1F8E9' },
  avatarWrap: { position: 'relative' },
  avatar: { backgroundColor: Colors.primaryLight },
  avatarLabel: { color: Colors.textOnPrimary, fontWeight: 'bold' },
  acceptedDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.surface,
  },
  chatBody: { flex: 1, minWidth: 0 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  chatName: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text, flex: 1 },
  chatTime: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: Spacing.xs },
  chatListing: { fontSize: FontSize.xs, color: Colors.primary, marginBottom: 2 },
  chatLastMsg: { fontSize: FontSize.sm, color: Colors.textSecondary },
  chatLastMsgAccepted: { color: Colors.success, fontWeight: '600' },
  offerBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: BorderRadius.round,
  },
  offerBadgeBuyer: { backgroundColor: '#E3F2FD' },
  offerBadgeText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: 'bold' },
  thumb: { width: 52, height: 52, borderRadius: BorderRadius.md, resizeMode: 'cover', flexShrink: 0 },
  thumbPlaceholder: { backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { fontSize: 20 },
  skeletonCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.border },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: Colors.border },
});
