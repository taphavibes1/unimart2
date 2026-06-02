import { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, KeyboardAvoidingView,
  Platform, TouchableOpacity,
} from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { db } from '../../lib/firebase';
import { sendMessage, subscribeToMessages, acceptOffer } from '../../lib/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Chat, Message } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { MESSAGE_TYPES } from '../../constants';
import { formatPrice, timeAgo } from '../../lib/utils';

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

type ChatItem =
  | { type: 'date'; label: string; key: string }
  | { type: 'message'; message: Message; showSender: boolean; key: string };

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'chats', id)).then((snap) => {
      if (snap.exists()) setChat({ id: snap.id, ...snap.data() } as Chat);
    });
    const unsub = subscribeToMessages(id, (msgs) => {
      setMessages(msgs);
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [id]);

  const isSeller = firebaseUser?.uid === chat?.sellerId;

  // Build flat list with date dividers and sender grouping
  const items = useMemo<ChatItem[]>(() => {
    const result: ChatItem[] = [];
    let lastDate = '';
    let lastSenderId = '';
    for (const msg of messages) {
      const dateLabel = formatDateLabel(msg.timestamp);
      if (dateLabel !== lastDate) {
        result.push({ type: 'date', label: dateLabel, key: `date-${msg.timestamp}` });
        lastDate = dateLabel;
        lastSenderId = '';
      }
      const showSender = msg.senderId !== lastSenderId && msg.type !== MESSAGE_TYPES.SYSTEM;
      result.push({ type: 'message', message: msg, showSender, key: msg.id });
      lastSenderId = msg.senderId;
    }
    return result;
  }, [messages]);

  const handleSendText = async () => {
    if (!firebaseUser || !id || !inputText.trim()) return;
    setSending(true);
    const text = inputText.trim();
    setInputText('');
    await sendMessage(id, {
      chatId: id,
      senderId: firebaseUser.uid,
      senderName: user?.name || 'User',
      text,
      timestamp: new Date().toISOString(),
      type: MESSAGE_TYPES.TEXT,
    });
    setSending(false);
  };

  const handleSendOffer = async () => {
    const amount = parseFloat(offerAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid amount', text2: 'Enter a positive price.' });
      return;
    }
    setSending(true);
    await sendMessage(id!, {
      chatId: id!,
      senderId: firebaseUser!.uid,
      senderName: user?.name || 'User',
      text: `💰 Offer: ${formatPrice(amount)}`,
      timestamp: new Date().toISOString(),
      type: MESSAGE_TYPES.OFFER,
      offerAmount: amount,
      offerStatus: 'pending',
    });
    setOfferAmount('');
    setShowOfferInput(false);
    setSending(false);
  };

  const handleAcceptOffer = async (msg: Message) => {
    if (!id || !msg.offerAmount || !user) return;
    await acceptOffer(id, msg.offerAmount, user.id, user.name);
    Toast.show({ type: 'success', text1: 'Offer Accepted!', text2: 'Buyer can now proceed to checkout.' });
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: chat?.listingTitle || 'Chat',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.textOnPrimary,
          headerRight: chat?.status === 'offer_accepted' && !isSeller ? () => (
            <TouchableOpacity onPress={() => router.push(`/checkout/${chat.listingId}`)} style={styles.checkoutHeaderBtn}>
              <Text style={styles.checkoutHeaderText}>Checkout →</Text>
            </TouchableOpacity>
          ) : undefined,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {chat?.status === 'offer_accepted' && (
          <View style={styles.offerBanner}>
            <Text style={styles.offerBannerText}>
              ✅ Offer of {formatPrice(chat.currentOffer ?? 0)} accepted
              {isSeller ? ' — waiting for buyer to pay' : ''}
            </Text>
            {!isSeller && (
              <TouchableOpacity onPress={() => router.push(`/checkout/${chat.listingId}`)}>
                <Text style={styles.offerBannerLink}>Pay now →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.messageList}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'date') return <DateDivider label={item.label} />;
            return (
              <MessageBubble
                message={item.message}
                isMe={item.message.senderId === firebaseUser?.uid}
                isSeller={isSeller}
                showSender={item.showSender}
                onAcceptOffer={() => handleAcceptOffer(item.message)}
              />
            );
          }}
        />

        {showOfferInput ? (
          <View style={styles.inputBar}>
            <TextInput
              label="Your offer (₦)"
              value={offerAmount}
              onChangeText={(v) => setOfferAmount(v.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              mode="outlined"
              style={styles.offerInput}
              dense
              autoFocus
              left={<TextInput.Affix text="₦" />}
            />
            <IconButton icon="send" onPress={handleSendOffer} iconColor={Colors.primary} disabled={sending} />
            <IconButton icon="close" onPress={() => setShowOfferInput(false)} iconColor={Colors.error} />
          </View>
        ) : (
          <View style={styles.inputBar}>
            {!isSeller && chat?.status !== 'offer_accepted' && (
              <IconButton icon="tag-outline" onPress={() => setShowOfferInput(true)} iconColor={Colors.accent} style={styles.offerBtn} />
            )}
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message…"
              mode="outlined"
              style={styles.textInput}
              dense
              onSubmitEditing={handleSendText}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <IconButton
              icon="send"
              onPress={handleSendText}
              iconColor={inputText.trim() ? Colors.primary : Colors.placeholder}
              disabled={!inputText.trim() || sending}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <View style={styles.dateDivider}>
      <View style={styles.dateLine} />
      <Text style={styles.dateDividerText}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

function MessageBubble({
  message, isMe, isSeller, showSender, onAcceptOffer,
}: {
  message: Message; isMe: boolean; isSeller: boolean;
  showSender: boolean; onAcceptOffer: () => void;
}) {
  if (message.type === MESSAGE_TYPES.SYSTEM) {
    return (
      <View style={styles.systemMsg}>
        <Text style={styles.systemMsgText}>{message.text}</Text>
      </View>
    );
  }

  const isOffer = message.type === MESSAGE_TYPES.OFFER;

  return (
    <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
      {showSender && !isMe && <Text style={styles.senderName}>{message.senderName}</Text>}
      <View style={[styles.bubble, isMe ? styles.bubbleMine : styles.bubbleTheirs, isOffer && styles.bubbleOffer]}>
        {isOffer ? (
          <View style={styles.offerContent}>
            <Text style={styles.offerEmoji}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.offerLabel, isMe && styles.offerLabelMine]}>
                {isMe ? 'Your offer' : `${message.senderName}'s offer`}
              </Text>
              <Text style={[styles.offerAmount, isMe && styles.offerAmountMine]}>
                {message.offerAmount ? formatPrice(message.offerAmount) : message.text}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMine]}>{message.text}</Text>
        )}
        {isOffer && isSeller && message.offerStatus === 'pending' && (
          <TouchableOpacity onPress={onAcceptOffer} style={styles.acceptBtn}>
            <Text style={styles.acceptBtnText}>✓ Accept Offer</Text>
          </TouchableOpacity>
        )}
        {isOffer && message.offerStatus === 'accepted' && (
          <Text style={styles.acceptedLabel}>✓ Accepted</Text>
        )}
        <Text style={[styles.timestamp, isMe && styles.timestampMine]}>{timeAgo(message.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkoutHeaderBtn: { paddingHorizontal: Spacing.sm },
  checkoutHeaderText: { color: Colors.accent, fontWeight: 'bold', fontSize: FontSize.sm },
  offerBanner: {
    backgroundColor: '#E8F5E9', padding: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.success + '33',
  },
  offerBannerText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '600', flex: 1 },
  offerBannerLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: 'bold', marginLeft: Spacing.sm },
  messageList: { padding: Spacing.md, paddingBottom: Spacing.lg },
  dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md, gap: Spacing.sm },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateDividerText: {
    fontSize: FontSize.xs, color: Colors.textSecondary,
    backgroundColor: Colors.background, paddingHorizontal: Spacing.sm,
  },
  systemMsg: {
    alignSelf: 'center', backgroundColor: '#F0F0F0',
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs, marginVertical: Spacing.xs, maxWidth: '85%',
  },
  systemMsgText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },
  bubbleWrapper: { maxWidth: '80%', marginBottom: 4 },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  senderName: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 2, marginLeft: Spacing.xs },
  bubble: { borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 4 },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: BorderRadius.xs },
  bubbleTheirs: { backgroundColor: Colors.surface, borderBottomLeftRadius: BorderRadius.xs },
  bubbleOffer: { borderWidth: 2, borderColor: Colors.accent },
  bubbleText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 20 },
  bubbleTextMine: { color: Colors.textOnPrimary },
  offerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  offerEmoji: { fontSize: 28 },
  offerLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 2 },
  offerLabelMine: { color: 'rgba(255,255,255,0.7)' },
  offerAmount: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  offerAmountMine: { color: Colors.accent },
  acceptBtn: {
    backgroundColor: Colors.success, borderRadius: BorderRadius.sm,
    padding: Spacing.sm, alignItems: 'center', marginTop: Spacing.xs,
  },
  acceptBtnText: { color: '#fff', fontWeight: 'bold', fontSize: FontSize.sm },
  acceptedLabel: { fontSize: FontSize.xs, color: Colors.success, fontWeight: 'bold', marginTop: 4 },
  timestamp: { fontSize: 10, color: Colors.textSecondary, alignSelf: 'flex-end', marginTop: 2 },
  timestampMine: { color: 'rgba(255,255,255,0.6)' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.sm, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border, gap: 2,
  },
  offerBtn: { margin: 0 },
  textInput: { flex: 1, backgroundColor: Colors.background },
  offerInput: { flex: 1, backgroundColor: Colors.background },
});
