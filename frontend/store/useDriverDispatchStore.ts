import { create } from 'zustand';

export type DriverPresence = 'ONLINE' | 'OFFLINE';
export type DriverAvailability = 'AVAILABLE' | 'BUSY' | 'BREAK';
export type DriverTripStatus = 'NONE' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'BOARDED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECTING';

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
    presence: DriverPresence;
    availability: DriverAvailability;
    tripStatus: DriverTripStatus;
    connectionStatus: ConnectionStatus;

    currentOffer: DriverOffer | null;
    activeTrip: any | null;
    tripSummary: DriverTripSummary | null;
    error: string | null;
    lastSequenceNumber: number;

    // Mutators
    setPresence: (presence: DriverPresence) => void;
    setAvailability: (availability: DriverAvailability) => void;
    setTripStatus: (tripStatus: DriverTripStatus) => void;
    setConnectionStatus: (connectionStatus: ConnectionStatus) => void;

    setCurrentOffer: (offer: DriverOffer | null) => void;
    setActiveTrip: (trip: any | null) => void;
    setTripSummary: (summary: DriverTripSummary | null) => void;
    setError: (error: string | null) => void;
    setLastSequenceNumber: (seq: number) => void;
    reset: () => void;
}

export const useDriverDispatchStore = create<DriverDispatchState>((set) => ({
    presence: 'OFFLINE',
    availability: 'BUSY',
    tripStatus: 'NONE',
    connectionStatus: 'DISCONNECTED',
    currentOffer: null,
    activeTrip: null,
    tripSummary: null,
    error: null,
    lastSequenceNumber: 0,

    setPresence: (presence) => set({ presence }),
    setAvailability: (availability) => set({ availability }),
    setTripStatus: (tripStatus) => set({ tripStatus }),
    setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

    setCurrentOffer: (offer) => set({ currentOffer: offer }),
    setActiveTrip: (trip) => set({ activeTrip: trip }),
    setTripSummary: (summary) => set({ tripSummary: summary }),
    setError: (error) => set({ error }),
    setLastSequenceNumber: (seq) => set({ lastSequenceNumber: seq }),
    reset: () => set({
        presence: 'OFFLINE',
        availability: 'BUSY',
        tripStatus: 'NONE',
        connectionStatus: 'DISCONNECTED',
        currentOffer: null,
        activeTrip: null,
        tripSummary: null,
        error: null,
        lastSequenceNumber: 0
    })
}));
