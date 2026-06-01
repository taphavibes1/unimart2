export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ListingStatus = 'available' | 'reserved' | 'sold';
export type PaymentStatus = 'held' | 'released' | 'refunded';
export type ChatStatus = 'active' | 'offer_accepted';
export type MessageType = 'text' | 'offer' | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  studentIdNumber: string;
  studentIdImageUrl: string;
  verificationStatus: VerificationStatus;
  rating: number;
  totalSales: number;
  isAdmin: boolean;
  walletBalance: number;
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrls: string[];
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  status: ListingStatus;
  location: {
    latitude: number;
    longitude: number;
  };
  locationLabel: string;
  createdAt: string;
  savedBy?: string[];
}

export interface Chat {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl?: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  lastMessage: string;
  lastMessageTime: string;
  status: ChatStatus;
  currentOffer?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  type: MessageType;
  offerAmount?: number;
  offerStatus?: 'pending' | 'accepted' | 'rejected';
}

export interface Payment {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  fee: number;
  totalAmount: number;
  paymentMethod: string;
  status: PaymentStatus;
  receiptUrl?: string;
  createdAt: string;
  releasedAt?: string;
  refundedAt?: string;
}

export interface Rating {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  listingId: string;
  score: number;
  comment: string;
  createdAt: string;
}
