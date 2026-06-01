import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { UGBOWO_CENTER } from '../constants';

const DEMO_LISTINGS = [
  {
    title: 'Engineering Mathematics Textbook (Stroud)',
    description: 'K.A. Stroud Engineering Mathematics 7th Edition. Very good condition, minimal highlights. Perfect for 100 and 200 level Engineering students.',
    price: 4500,
    category: 'textbooks',
  },
  {
    title: 'Reading Lamp with USB Charging Port',
    description: 'Flexible neck LED desk lamp with 3 brightness levels and a USB port for phone charging. Works with any power bank. Used for one semester.',
    price: 2800,
    category: 'hostel-gear',
  },
  {
    title: 'Infinix Hot 12 — 6GB RAM, 128GB',
    description: 'Infinix Hot 12 in good working condition. Screen is perfect, no cracks. Battery still holds charge well. Selling because I upgraded. Comes with charger.',
    price: 52000,
    category: 'electronics',
  },
  {
    title: 'UNIBEN Hoodie — Navy Blue (M)',
    description: 'Official UNIBEN hoodie, size Medium. Only worn twice, almost new. Great for cold mornings in lecture halls.',
    price: 3500,
    category: 'fashion',
  },
  {
    title: 'Jollof Rice + Chicken Combo (Daily)',
    description: 'Home-cooked jollof rice and fried chicken packed in airtight containers. Order before 12pm for 2pm delivery to your hostel. Fresh every day.',
    price: 1200,
    category: 'food-snacks',
  },
  {
    title: 'Handwritten Course Notes — EEE 301',
    description: 'Complete, well-organized handwritten notes for EEE 301 (Electromagnetic Fields). Covers all topics with worked examples. Photocopies available.',
    price: 800,
    category: 'textbooks',
  },
  {
    title: 'Laptop Cooling Pad',
    description: 'USB-powered laptop cooling pad with 2 fans. Compatible with laptops up to 15.6 inches. Keeps your laptop cool during long study sessions.',
    price: 3000,
    category: 'electronics',
  },
  {
    title: 'Mattress Topper (Single Bed)',
    description: '3-inch memory foam mattress topper for standard hostel single beds. Makes the hard hostel mattress much more comfortable. Clean, no stains.',
    price: 5500,
    category: 'hostel-gear',
  },
  {
    title: 'CV Writing & LinkedIn Optimization',
    description: 'Professional CV writing service by a final-year student. I\'ve helped 20+ students land internships. Turnaround: 24 hours. DM for samples.',
    price: 1500,
    category: 'services',
  },
  {
    title: 'HP Printer — DeskJet 2331',
    description: 'HP DeskJet 2331 all-in-one printer. Prints, scans, and copies. Ink cartridge is half full. Ideal for printing assignments and reports in your room.',
    price: 18000,
    category: 'electronics',
  },
];

export async function seedDemoListings(
  sellerId: string,
  sellerName: string
): Promise<number> {
  const now = new Date();

  for (let i = 0; i < DEMO_LISTINGS.length; i++) {
    const item = DEMO_LISTINGS[i];
    // Spread creation times across the last 7 days for realistic ordering
    const createdAt = new Date(now.getTime() - i * 6 * 60 * 60 * 1000).toISOString();

    await addDoc(collection(db, 'listings'), {
      ...item,
      imageUrls: [],
      sellerId,
      sellerName,
      sellerRating: 0,
      status: 'available',
      location: UGBOWO_CENTER,
      locationLabel: 'UNIBEN Ugbowo',
      savedBy: [],
      createdAt,
    });
  }

  return DEMO_LISTINGS.length;
}
