import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  doc, getDoc, collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, updateDoc, Timestamp,
} from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { Chat, Message } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { MESSAGE_TYPES, CHAT_STATUSES } from '../../constants';
import { formatPrice, timeAgo } from '../../lib/utils';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, firebaseUser } = useAuthStore();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'chats', id)).then((snap) => {
      if (snap.exists()) setChat({ id: snap.id, ...snap.data() } as Chat);
    });

    const q = query(collection(db, 'chats', id, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [id]);

  const sendMessage = async (type: 'text' | 'offer' = 'text', amount?: number) => {
    if (!firebaseUser || !id || !chat) return;
    const text = type === 'offer' ? `💰 Offer: ${formatPrice(amount!)}` : inputText.trim();
    if (!text) return;

    const msgData: any = {
      chatId: id,
      senderId: firebaseUser.uid,
      senderName: user?.name || 'User',
      text,
      timestamp: new Date().toISOString(),
      type,
    };
    if (type === 'offer' && amount) {
      msgData.offerAmount = amount;
      msgData.offerStatus = 'pending';
    }

    await addDoc(collection(db, 'chats', id, 'messages'), msgData);
    await updateDoc(doc(db, 'chats', id), {
      lastMessage: text,
      lastMessageTime: new Date().toISOString(),
    });

    setInputText('');
    setShowOfferInput(false);
    setOfferAmount('');
  };

  const sendOffer = async () => {
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid amount', text2: 'Enter a valid offer price.' });
      return;
    }
    await sendMessage('offer', amount);
  };

  const acceptOffer = async (msg: Message) => {
    if (!id || !msg.offerAmount) return;
    await updateDoc(doc(db, 'chats', id), { status: CHAT_STATUSES.OFFER_ACCEPTED, currentOffer: msg.offerAmount });
    await addDoc(collection(db, 'chats', id, 'messages'), {
      chatId: id,
      senderId: 'system',
      senderName: 'System',
      text: `✅ Offer of ${formatPrice(msg.offerAmount)} accepted! Proceed to checkout.`,
      timestamp: new Date().toISOString(),
      type: MESSAGE_TYPES.SYSTEM,
    });
    await updateDoc(doc(db, 'chats', id), {
      lastMessage: `Offer of ${formatPrice(msg.offerAmount)} accepted`,
      lastMessageTime: new Date().toISOString(),
    });
    Toast.show({ type: 'success', text1: 'Offer Accepted!', text2: 'Buyer can now proceed to checkout.' });
  };

  const isSeller = firebaseUser?.uid === chat?.sellerId;

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
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {chat?.status === CHAT_STATUSES.OFFER_ACCEPTED && (
          <View style={styles.offerAcceptedBanner}>
            <Text style={styles.offerAcceptedText}>
              ✅ Offer accepted — {!isSeller ? 'proceed to' : 'waiting for buyer to complete'} checkout
            </Text>
            {!isSeller && (
              <TouchableOpacity onPress={() => router.push(`/checkout/${chat.listingId}`)}>
                <Text style={styles.checkoutLink}>Go to Checkout →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMe={item.senderId === firebaseUser?.uid}
              isSeller={isSeller}
              onAcceptOffer={() => acceptOffer(item)}
            />
          )}
        />

        {showOfferInput ? (
          <View style={styles.offerInputBar}>
            <TextInput
              label="Your offer (₦)"
              value={offerAmount}
              onChangeText={setOfferAmount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.offerInput}
              dense
            />
            <IconButton icon="send" onPress={sendOffer} iconColor={Colors.primary} />
            <IconButton icon="close" onPress={() => setShowOfferInput(false)} iconColor={Colors.error} />
          </View>
        ) : (
          <View style={styles.inputBar}>
            {!isSeller && (
              <IconButton
                icon="tag"
                onPress={() => setShowOfferInput(true)}
                iconColor={Colors.accent}
                style={styles.offerBtn}
              />
            )}
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              mode="outlined"
              style={styles.input}
              dense
              onSubmitEditing={() => sendMessage()}
            />
            <IconButton
              icon="send"
              onPress={() => sendMessage()}
              iconColor={Colors.primary}
              disabled={!inputText.trim()}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

function MessageBubble({
  message,
  isMe,
  isSeller,
  onAcceptOffer,
}: {
  message: Message;
  isMe: boolean;
  isSeller: boolean;
  onAcceptOffer: () => void;
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
      <View style={[
        styles.bubble,
        isMe ? styles.bubbleMine : styles.bubbleTheirs,
        isOffer && styles.bubbleOffer,
      ]}>
        {!isMe && <Text style={styles.senderName}>{message.senderName}</Text>}
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMine]}>{message.text}</Text>
        {isOffer && isSeller && message.offerStatus === 'pending' && (
          <TouchableOpacity onPress={onAcceptOffer} style={styles.acceptBtn}>
            <Text style={styles.acceptBtnText}>✓ Accept Offer</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.timestamp, isMe && styles.timestampMine]}>
          {timeAgo(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  offerAcceptedBanner: {
    backgroundColor: '#E8F5E9',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.success + '44',
    gap: 4,
  },
  offerAcceptedText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '600' },
  checkoutLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' },
  messageList: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
  systemMsg: { alignSelf: 'center', backgroundColor: '#F0F0F0', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  systemMsgText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic' },
  bubbleWrapper: { maxWidth: '80%' },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubble: { borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 4 },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: BorderRadius.xs },
  bubbleTheirs: { backgroundColor: Colors.surface, borderBottomLeftRadius: BorderRadius.xs },
  bubbleOffer: { borderWidth: 2, borderColor: Colors.accent },
  senderName: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  bubbleText: { fontSize: FontSize.md, color: Colors.text },
  bubbleTextMine: { color: Colors.textOnPrimary },
  acceptBtn: { backgroundColor: Colors.success, borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center', marginTop: Spacing.xs },
  acceptBtnText: { color: '#fff', fontWeight: 'bold', fontSize: FontSize.sm },
  timestamp: { fontSize: 10, color: Colors.textSecondary, alignSelf: 'flex-end' },
  timestampMine: { color: 'rgba(255,255,255,0.6)' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  offerBtn: { margin: 0 },
  input: { flex: 1, backgroundColor: Colors.background, fontSize: FontSize.md },
  offerInputBar: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  offerInput: { flex: 1, backgroundColor: Colors.background },
});
