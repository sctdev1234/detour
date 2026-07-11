/**
 * @deprecated V1 Legacy Dispatch Store
 * WARNING: Do NOT use this store for active trip state or dispatching.
 * This store contains "ghost state" that conflicts with the canonical Truth
 * (React Query's `useClientTrips` pulling from `TripInstance`).
 * It is only preserved for the `!featureFlags.enableV2Dispatch` fallback.
 * For all new features, use `useDispatchStore` (V2) which pulls from the 
 * Single Source of Truth backend recovery endpoints.
 */

import { create } from 'zustand';
import { LatLng } from 'react-native-maps';

export type RideStatus = 'DRAFT' | 'SEARCHING' | 'OFFERS_OPEN' | 'OFFER_ACCEPTED' | 'DRIVER_ASSIGNED' | 'CANCELLED_BY_PASSENGER' | 'CANCELLED_BY_SYSTEM';

export interface Offer {
    _id: string;
    driverId: string;
    proposedPrice: number;
    etaMinutes: number;
    expiresAt: string;
    driverDetails?: {
        name: string;
        rating: number;
        vehicle: string;
    };
}

interface RideState {
    status: RideStatus;
    tripInstanceId: string | null;
    pickup: LatLng | null;
    destination: LatLng | null;
    pickupAddress: string;
    destinationAddress: string;
    offers: Offer[];
    selectedOfferId: string | null;
    searchRadius: number;
    basePrice: number;
    
    // Actions
    setStatus: (status: RideStatus) => void;
    setRideRequestDetails: (id: string, pickup: LatLng, dest: LatLng, pAddr: string, dAddr: string, basePrice: number) => void;
    addOffer: (offer: Offer) => void;
    removeOffer: (offerId: string) => void;
    clearOffers: () => void;
    setSelectedOffer: (offerId: string | null) => void;
    updateSearchRadius: (radius: number) => void;
    reset: () => void;
}

export const useRideStore = create<RideState>((set) => ({
    status: 'DRAFT',
    tripInstanceId: null,
    pickup: null,
    destination: null,
    pickupAddress: '',
    destinationAddress: '',
    offers: [],
    selectedOfferId: null,
    searchRadius: 3000,
    basePrice: 0,

    setStatus: (status) => set({ status }),
    
    setRideRequestDetails: (id, pickup, destination, pickupAddress, destinationAddress, basePrice) => set({
        tripInstanceId: id,
        pickup,
        destination,
        pickupAddress,
        destinationAddress,
        basePrice,
        status: 'SEARCHING'
    }),

    addOffer: (offer) => set((state) => {
        // Prevent duplicate offers from same driver or same id
        const exists = state.offers.some(o => o._id === offer._id);
        if (exists) return state;
        return { 
            offers: [...state.offers, offer],
            status: state.status === 'SEARCHING' ? 'OFFERS_OPEN' : state.status
        };
    }),

    removeOffer: (offerId) => set((state) => {
        const newOffers = state.offers.filter(o => o._id !== offerId);
        return {
            offers: newOffers,
            status: newOffers.length === 0 && state.status === 'OFFERS_OPEN' ? 'SEARCHING' : state.status,
            selectedOfferId: state.selectedOfferId === offerId ? null : state.selectedOfferId
        };
    }),

    clearOffers: () => set({ offers: [], selectedOfferId: null }),
    
    setSelectedOffer: (offerId) => set({ selectedOfferId: offerId }),
    
    updateSearchRadius: (radius) => set({ searchRadius: radius }),

    reset: () => set({
        status: 'DRAFT',
        tripInstanceId: null,
        pickup: null,
        destination: null,
        pickupAddress: '',
        destinationAddress: '',
        offers: [],
        selectedOfferId: null,
        searchRadius: 3000,
        basePrice: 0
    })
}));
