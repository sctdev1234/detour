import { create } from 'zustand';
import { LatLng } from 'react-native-maps';

export type RideStatus = 'DRAFT' | 'SEARCHING' | 'OFFERS_INCOMING' | 'OFFER_SELECTED' | 'ACCEPTED' | 'FAILED' | 'CANCELLED';

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
    rideRequestId: string | null;
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
    rideRequestId: null,
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
        rideRequestId: id,
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
            status: state.status === 'SEARCHING' ? 'OFFERS_INCOMING' : state.status
        };
    }),

    removeOffer: (offerId) => set((state) => {
        const newOffers = state.offers.filter(o => o._id !== offerId);
        return {
            offers: newOffers,
            status: newOffers.length === 0 && state.status === 'OFFERS_INCOMING' ? 'SEARCHING' : state.status,
            selectedOfferId: state.selectedOfferId === offerId ? null : state.selectedOfferId
        };
    }),

    clearOffers: () => set({ offers: [], selectedOfferId: null }),
    
    setSelectedOffer: (offerId) => set({ selectedOfferId: offerId }),
    
    updateSearchRadius: (radius) => set({ searchRadius: radius }),

    reset: () => set({
        status: 'DRAFT',
        rideRequestId: null,
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
