export const APP_NAME = 'Ugbowo Market';
export const UNIVERSITY_NAME = 'University of Benin (UNIBEN)';
export const CAMPUS_LOCATION = 'Ugbowo, Benin City, Nigeria';

export const UGBOWO_BOUNDS = {
  minLat: 6.33,
  maxLat: 6.37,
  minLng: 5.60,
  maxLng: 5.65,
};

export const UGBOWO_CENTER = {
  latitude: 6.3490,
  longitude: 5.6221,
};

export const SAFE_MEETING_ZONES = [
  {
    id: 'main-gate',
    name: 'Main Gate',
    description: 'UNIBEN Main Entrance Gate',
    latitude: 6.3456,
    longitude: 5.6198,
  },
  {
    id: 'june12-cbn',
    name: 'June 12 / CBN Junction',
    description: 'Popular CBN Junction meetup spot',
    latitude: 6.3512,
    longitude: 5.6234,
  },
  {
    id: 'faculty-engineering',
    name: 'Faculty of Engineering',
    description: 'Engineering Faculty Building',
    latitude: 6.3478,
    longitude: 5.6215,
  },
];

export const LISTING_CATEGORIES = [
  { id: 'textbooks', label: 'Textbooks', icon: 'book-open-variant' },
  { id: 'hostel-gear', label: 'Hostel Gear', icon: 'bed' },
  { id: 'electronics', label: 'Electronics', icon: 'cellphone' },
  { id: 'fashion', label: 'Fashion', icon: 'hanger' },
  { id: 'food-snacks', label: 'Food & Snacks', icon: 'food' },
  { id: 'services', label: 'Services', icon: 'tools' },
  { id: 'other', label: 'Other', icon: 'dots-horizontal' },
];

export const PLATFORM_FEE_PERCENT = 2;

export const DEMO_PAYMENT_METHODS = [
  { id: 'wallet', label: 'Wallet Balance (Demo)', icon: 'wallet' },
  { id: 'bank-transfer', label: 'Bank Transfer (Simulated)', icon: 'bank' },
  { id: 'cash-delivery', label: 'Cash on Delivery', icon: 'cash' },
  { id: 'pay-meetup', label: 'Pay on Meetup', icon: 'handshake' },
  { id: 'mock-card', label: 'Mock Card Payment', icon: 'credit-card' },
  { id: 'receipt-upload', label: 'Transfer Receipt Upload', icon: 'receipt' },
];

export const LISTING_STATUSES = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SOLD: 'sold',
} as const;

export const PAYMENT_STATUSES = {
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
} as const;

export const VERIFICATION_STATUSES = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export const CHAT_STATUSES = {
  ACTIVE: 'active',
  OFFER_ACCEPTED: 'offer_accepted',
} as const;

export const MESSAGE_TYPES = {
  TEXT: 'text',
  OFFER: 'offer',
  SYSTEM: 'system',
} as const;
