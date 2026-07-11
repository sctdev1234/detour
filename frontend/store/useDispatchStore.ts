import { create } from 'zustand';

export type DispatchStatus = 'IDLE' | 'DRAFT' | 'SEARCHING' | 'OFFERS_OPEN' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'BOARDED' | 'STARTED' | 'COMPLETED' | 'CANCELLED' | 'ERROR';

interface DispatchState {
    // State
    status: DispatchStatus;
    tripInstance: any | null;
    offers: any[];
    assignment: any | null;
    tripSummary: any | null;
    error: string | null;

    // Mutators (Used by Actions)
    setStatus: (status: DispatchStatus) => void;
    setTripInstance: (instance: any) => void;
    setOffers: (offers: any[]) => void;
    addOffer: (offer: any) => void;
    setAssignment: (assignment: any) => void;
    setTripSummary: (summary: any) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

export const useDispatchStore = create<DispatchState>((set) => ({
    status: 'IDLE',
    tripInstance: null,
    offers: [],
    assignment: null,
    tripSummary: null,
    error: null,

    setStatus: (status) => set({ status }),
    setTripInstance: (instance) => set({ tripInstance: instance }),
    setOffers: (offers) => set({ offers }),
    addOffer: (offer) => set((state) => ({ offers: [...state.offers, offer] })),
    setAssignment: (assignment) => set({ assignment }),
    setTripSummary: (summary) => set({ tripSummary: summary }),
    setError: (error) => set({ error }),
    reset: () => set({
        status: 'IDLE',
        tripInstance: null,
        offers: [],
        assignment: null,
        tripSummary: null,
        error: null
    })
}));
