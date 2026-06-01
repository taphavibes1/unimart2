import { create } from 'zustand';
import { Listing } from '../types';

interface ListingState {
  listings: Listing[];
  featuredListings: Listing[];
  selectedCategory: string | null;
  searchQuery: string;
  isLoading: boolean;
  setListings: (listings: Listing[]) => void;
  setFeaturedListings: (listings: Listing[]) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  addListing: (listing: Listing) => void;
  updateListing: (id: string, updates: Partial<Listing>) => void;
  removeListing: (id: string) => void;
}

export const useListingStore = create<ListingState>((set) => ({
  listings: [],
  featuredListings: [],
  selectedCategory: null,
  searchQuery: '',
  isLoading: false,
  setListings: (listings) => set({ listings }),
  setFeaturedListings: (listings) => set({ featuredListings: listings }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLoading: (loading) => set({ isLoading: loading }),
  addListing: (listing) =>
    set((state) => ({ listings: [listing, ...state.listings] })),
  updateListing: (id, updates) =>
    set((state) => ({
      listings: state.listings.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),
  removeListing: (id) =>
    set((state) => ({
      listings: state.listings.filter((l) => l.id !== id),
    })),
}));
