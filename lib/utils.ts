import { UGBOWO_BOUNDS, PLATFORM_FEE_PERCENT } from '../constants';

export function formatPrice(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function calculateFee(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
}

export function isInsideUgbowo(lat: number, lng: number): boolean {
  return (
    lat >= UGBOWO_BOUNDS.minLat &&
    lat <= UGBOWO_BOUNDS.maxLat &&
    lng >= UGBOWO_BOUNDS.minLng &&
    lng <= UGBOWO_BOUNDS.maxLng
  );
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getApproxLocation(lat: number, lng: number): { lat: number; lng: number } {
  // Offset by ~500m to protect exact location
  const offset = 0.0045;
  return {
    lat: lat + (Math.random() - 0.5) * offset,
    lng: lng + (Math.random() - 0.5) * offset,
  };
}

export function validateNigerianPhone(phone: string): boolean {
  return /^(\+234|0)[789][01]\d{8}$/.test(phone.replace(/\s/g, ''));
}
