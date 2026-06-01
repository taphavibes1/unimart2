import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, arrayUnion, arrayRemove,
  increment, Unsubscribe, QueryConstraint,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { User, Listing, Chat, Message, Payment, Rating } from '../types';
import { generateId } from './utils';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<User, 'name' | 'phone' | 'department'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates);
}

export function subscribeToUser(uid: string, cb: (u: User | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null);
  });
}

export async function getPendingUsers(): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('verificationStatus', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
}

export function subscribeToPendingUsers(cb: (users: User[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'users'),
    where('verificationStatus', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
  });
}

export async function setVerificationStatus(
  uid: string,
  status: 'verified' | 'rejected'
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { verificationStatus: status });
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export function subscribeToAvailableListings(
  cb: (listings: Listing[]) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe {
  const q = query(
    collection(db, 'listings'),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc'),
    limit(60),
    ...constraints
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing)));
  });
}

export function subscribeToSellerListings(
  sellerId: string,
  cb: (listings: Listing[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'listings'),
    where('sellerId', '==', sellerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing)));
  });
}

export function subscribeToSavedListings(
  uid: string,
  cb: (listings: Listing[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'listings'),
    where('savedBy', 'array-contains', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing)));
  });
}

export async function getListing(id: string): Promise<Listing | null> {
  const snap = await getDoc(doc(db, 'listings', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Listing) : null;
}

export async function createListing(data: Omit<Listing, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'listings'), data);
  return ref.id;
}

export async function updateListingStatus(
  id: string,
  status: Listing['status']
): Promise<void> {
  await updateDoc(doc(db, 'listings', id), { status });
}

export async function toggleSaveListing(
  listingId: string,
  uid: string,
  isSaved: boolean
): Promise<void> {
  await updateDoc(doc(db, 'listings', listingId), {
    savedBy: isSaved ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function uploadListingImages(
  uid: string,
  uris: string[]
): Promise<string[]> {
  const urls: string[] = [];
  for (const uri of uris) {
    const res = await fetch(uri);
    const blob = await res.blob();
    const imgRef = ref(storage, `listings/${uid}/${generateId()}`);
    await uploadBytes(imgRef, blob);
    urls.push(await getDownloadURL(imgRef));
  }
  return urls;
}

// ─── Chats ────────────────────────────────────────────────────────────────────

export async function getOrCreateChat(
  listingId: string,
  listingTitle: string,
  listingImageUrl: string,
  buyerId: string,
  buyerName: string,
  sellerId: string,
  sellerName: string
): Promise<string> {
  // Check if chat already exists
  const existing = await getDocs(
    query(
      collection(db, 'chats'),
      where('listingId', '==', listingId),
      where('buyerId', '==', buyerId)
    )
  );
  if (!existing.empty) return existing.docs[0].id;

  // Create new chat
  const chatId = generateId();
  await setDoc(doc(db, 'chats', chatId), {
    listingId,
    listingTitle,
    listingImageUrl,
    buyerId,
    buyerName,
    sellerId,
    sellerName,
    lastMessage: 'Chat started',
    lastMessageTime: new Date().toISOString(),
    status: 'active',
  } satisfies Omit<Chat, 'id'>);

  // Post a system welcome message
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    chatId,
    senderId: 'system',
    senderName: 'Ugbowo Market',
    text: `👋 Chat started for "${listingTitle}". Be respectful and meet only at safe campus zones.`,
    timestamp: new Date().toISOString(),
    type: 'system',
  });

  return chatId;
}

export function subscribeToUserChats(
  uid: string,
  cb: (chats: Chat[]) => void
): Unsubscribe {
  const map = new Map<string, Chat>();

  const merge = () => {
    const sorted = Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
    cb(sorted);
  };

  const buyerQ = query(
    collection(db, 'chats'),
    where('buyerId', '==', uid),
    orderBy('lastMessageTime', 'desc')
  );
  const sellerQ = query(
    collection(db, 'chats'),
    where('sellerId', '==', uid),
    orderBy('lastMessageTime', 'desc')
  );

  const u1 = onSnapshot(buyerQ, (snap) => {
    snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Chat));
    merge();
  });
  const u2 = onSnapshot(sellerQ, (snap) => {
    snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Chat));
    merge();
  });

  return () => { u1(); u2(); };
}

export function subscribeToMessages(
  chatId: string,
  cb: (messages: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
  });
}

export async function sendMessage(
  chatId: string,
  msg: Omit<Message, 'id'>
): Promise<void> {
  await addDoc(collection(db, 'chats', chatId, 'messages'), msg);
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: msg.text,
    lastMessageTime: msg.timestamp,
  });
}

export async function acceptOffer(
  chatId: string,
  offerAmount: number,
  uid: string,
  userName: string
): Promise<void> {
  await updateDoc(doc(db, 'chats', chatId), {
    status: 'offer_accepted',
    currentOffer: offerAmount,
  });
  await sendMessage(chatId, {
    chatId,
    senderId: 'system',
    senderName: 'Ugbowo Market',
    text: `✅ Offer of ₦${offerAmount.toLocaleString()} accepted by ${userName}. Proceed to checkout.`,
    timestamp: new Date().toISOString(),
    type: 'system',
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function createPayment(data: Omit<Payment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'payments'), data);
  return ref.id;
}

export async function releasePayment(paymentId: string, listingId: string): Promise<void> {
  await updateDoc(doc(db, 'payments', paymentId), {
    status: 'released',
    releasedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, 'listings', listingId), { status: 'sold' });
  // Increment seller's totalSales
  const payment = await getDoc(doc(db, 'payments', paymentId));
  if (payment.exists()) {
    await updateDoc(doc(db, 'users', payment.data().sellerId), {
      totalSales: increment(1),
    });
  }
}

export async function refundPayment(paymentId: string, listingId: string): Promise<void> {
  await updateDoc(doc(db, 'payments', paymentId), {
    status: 'refunded',
    refundedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, 'listings', listingId), { status: 'available' });
}

export function subscribeToHeldPayments(cb: (payments: Payment[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'payments'),
    where('status', '==', 'held'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
  });
}

export function subscribeToBuyerPayments(
  buyerId: string,
  cb: (payments: Payment[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'payments'),
    where('buyerId', '==', buyerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
  });
}

// ─── Ratings ─────────────────────────────────────────────────────────────────

export async function submitRating(data: Omit<Rating, 'id'>): Promise<void> {
  await addDoc(collection(db, 'ratings'), data);
  // Recompute seller average rating
  const q = query(collection(db, 'ratings'), where('toUserId', '==', data.toUserId));
  const snap = await getDocs(q);
  const scores = snap.docs.map((d) => d.data().score as number);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  await updateDoc(doc(db, 'users', data.toUserId), {
    rating: Math.round(avg * 10) / 10,
  });
}

export async function getUserRatings(uid: string): Promise<Rating[]> {
  const q = query(
    collection(db, 'ratings'),
    where('toUserId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rating));
}
