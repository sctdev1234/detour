import { create } from 'zustand';

export interface LatLng {
    latitude: number;
    longitude: number;
    heading?: number;
    address?: string;
}

interface TripState {
    // Only Client-Side UI State
    selectedTripId: string | null;
    filterMode: 'all' | 'driver' | 'client';

    // Actions
    setSelectedTripId: (id: string | null) => void;
    setFilterMode: (mode: 'all' | 'driver' | 'client') => void;
}

export const useTripStore = create<TripState>((set) => ({
    selectedTripId: null,
    filterMode: 'all',

    setSelectedTripId: (id) => set({ selectedTripId: id }),
    setFilterMode: (mode) => set({ filterMode: mode }),
}));
