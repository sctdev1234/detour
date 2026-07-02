import { create } from 'zustand';

/**
 * Driver Dispatch Status — reflects the driver's lifecycle within the V2 dispatch system.
 * This is separate from the passenger-side DispatchStatus.
 */
export type DriverDispatchStatus =
    | 'OFFLINE'        // Driver not accepting trips
    | 'ONLINE'         // Driver available, no active dispatch
    | 'BREAK'          // Driver on break
    | 'OFFER_INCOMING' // Offer received from system
    | 'EN_ROUTE'       // Driving to passenger
    | 'ARRIVED'        // At pickup, waiting for passenger
    | 'TRIP_ACTIVE'    // Ride in progress
    | 'TRIP_COMPLETED' // Post-ride summary
    | 'ERROR';

export interface DriverOffer {
    _id: string;
    tripInstanceId: any;
    passengerId: string;
    price: number;
    estimatedArrival: number; // seconds
    estimatedDuration: number;
    expiresAt: string;
    pickup?: { coordinates: [number, number]; address: string };
    destination?: { coordinates: [number, number]; address: string };
}

export interface DriverTripSummary {
    tripInstanceId: string;
    earnings: number;
    distance: number;
    duration: number;
    rating?: number;
}

interface DriverDispatchState {
    // State
    status: DriverDispatchStatus;
    currentOffer: DriverOffer | null;
    activeTrip: any | null;
    tripSummary: DriverTripSummary | null;
    error: string | null;

    // Mutators
    setStatus: (status: DriverDispatchStatus) => void;
    setCurrentOffer: (offer: DriverOffer | null) => void;
    setActiveTrip: (trip: any | null) => void;
    setTripSummary: (summary: DriverTripSummary | null) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

export const useDriverDispatchStore = create<DriverDispatchState>((set) => ({
    status: 'OFFLINE',
    currentOffer: null,
    activeTrip: null,
    tripSummary: null,
    error: null,

    setStatus: (status) => set({ status }),
    setCurrentOffer: (offer) => set({ currentOffer: offer }),
    setActiveTrip: (trip) => set({ activeTrip: trip }),
    setTripSummary: (summary) => set({ tripSummary: summary }),
    setError: (error) => set({ error }),
    reset: () => set({
        status: 'OFFLINE',
        currentOffer: null,
        activeTrip: null,
        tripSummary: null,
        error: null
    })
}));
