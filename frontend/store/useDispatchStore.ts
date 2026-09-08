import { create } from 'zustand';

export type DispatchStatus = 
    | 'IDLE' 
    | 'DRAFT' 
    | 'SEARCHING' 
    | 'OFFERS_OPEN' 
    | 'ASSIGNED' 
    | 'EN_ROUTE' 
    | 'DRIVER_ARRIVED' 
    | 'ARRIVED' 
    | 'BOARDED' 
    | 'STARTED' 
    | 'DROPPED_OFF' 
    | 'COMPLETED' 
    | 'CANCELLED' 
    | 'ERROR';

export interface FindingDriversContext {
    routeId: string;
    tripInstanceId?: string;
    offers: any[];
}

export const extractOfferRouteId = (offer: any): string | null => {
    if (!offer) return null;
    const raw =
        offer.metadata?.clientRouteId ||
        offer.clientRouteId ||
        offer.routeInfo?.clientRouteId ||
        offer.passengerRouteId ||
        offer.routeId ||
        (typeof offer.tripInstanceId === 'object' && offer.tripInstanceId !== null
            ? (offer.tripInstanceId.metadata?.clientRouteId || offer.tripInstanceId.clientRouteId)
            : null) ||
        (offer.metadata && typeof offer.metadata.get === 'function' ? offer.metadata.get('clientRouteId') : null) ||
        (typeof offer.tripInstanceId === 'string' ? offer.tripInstanceId : null);

    if (!raw) return null;
    return typeof raw === 'object' ? (raw._id || raw.id || String(raw)) : String(raw);
};

interface DispatchState {
    // State
    status: DispatchStatus;
    tripInstance: any | null;
    offers: any[];
    assignment: any | null;
    tripSummary: any | null;
    error: string | null;

    // Per-route isolated state
    offersByRoute: Record<string, any[]>;
    findingRouteIds: Record<string, boolean>;
    dismissedPanelRouteIds: Record<string, boolean>;
    activeDriverRoute: any | null;

    // Mutators (Used by Actions)
    setStatus: (status: DispatchStatus) => void;
    setTripInstance: (instance: any) => void;
    setOffers: (offers: any[]) => void;
    addOffer: (offer: any) => void;
    setOffersForRoute: (routeId: string, offers: any[]) => void;
    addOfferForRoute: (routeId: string, offer: any) => void;
    setFindingForRoute: (routeId: string, isFinding: boolean) => void;
    dismissPanelForRoute: (routeId: string, dismissed?: boolean) => void;
    setActiveDriverRoute: (driverRoute: any | null) => void;
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
    offersByRoute: {},
    findingRouteIds: {},
    dismissedPanelRouteIds: {},
    activeDriverRoute: null,

    setStatus: (status) => set({ status }),
    setTripInstance: (instance) => set({ tripInstance: instance }),
    setOffers: (offers) => set((state) => {
        const nextByRoute: Record<string, any[]> = {};
        for (const offer of offers) {
            const rId = extractOfferRouteId(offer);
            if (rId) {
                if (!nextByRoute[rId]) nextByRoute[rId] = [];
                nextByRoute[rId].push(offer);
            }
        }
        return { offers, offersByRoute: nextByRoute };
    }),
    addOffer: (offer) => set((state) => {
        const offerId = offer._id || offer.id || offer.offerId;
        const normalizedOffer = { ...offer, _id: offerId, id: offerId };
        const nextOffers = [...state.offers.filter(o => (o._id || o.id) !== offerId), normalizedOffer];
        let rId = extractOfferRouteId(normalizedOffer);
        const nextByRoute = { ...state.offersByRoute };

        if (!rId) {
            for (const existingRId of Object.keys(nextByRoute)) {
                if (nextByRoute[existingRId].some(o => (o._id || o.id) === offerId)) {
                    rId = existingRId;
                    break;
                }
            }
        }
        if (!rId) {
            const findingIds = Object.keys(state.findingRouteIds).filter(id => state.findingRouteIds[id]);
            if (findingIds.length === 1) {
                rId = findingIds[0];
            }
        }

        if (rId) {
            normalizedOffer.clientRouteId = rId;
            const existing = nextByRoute[rId] || [];
            nextByRoute[rId] = [...existing.filter(o => (o._id || o.id) !== offerId), normalizedOffer];
        }

        return {
            offers: nextOffers,
            offersByRoute: nextByRoute,
            status: state.status === 'SEARCHING' || state.status === 'IDLE' ? 'OFFERS_OPEN' : state.status
        };
    }),
    setOffersForRoute: (routeId, offers) => set((state) => ({
        offersByRoute: { ...state.offersByRoute, [routeId]: offers }
    })),
    addOfferForRoute: (routeId, offer) => set((state) => {
        const offerId = offer._id || offer.id || offer.offerId;
        const normalizedOffer = { ...offer, _id: offerId, id: offerId, clientRouteId: routeId };
        const existing = state.offersByRoute[routeId] || [];
        const nextForRoute = [...existing.filter(o => (o._id || o.id) !== offerId), normalizedOffer];
        const nextOffers = [...state.offers.filter(o => (o._id || o.id) !== offerId), normalizedOffer];
        return {
            offers: nextOffers,
            offersByRoute: { ...state.offersByRoute, [routeId]: nextForRoute },
            status: state.status === 'SEARCHING' || state.status === 'IDLE' ? 'OFFERS_OPEN' : state.status
        };
    }),
    setFindingForRoute: (routeId, isFinding) => set((state) => ({
        findingRouteIds: { ...state.findingRouteIds, [routeId]: isFinding },
        dismissedPanelRouteIds: isFinding ? { ...state.dismissedPanelRouteIds, [routeId]: false } : state.dismissedPanelRouteIds
    })),
    dismissPanelForRoute: (routeId, dismissed = true) => set((state) => ({
        dismissedPanelRouteIds: { ...state.dismissedPanelRouteIds, [routeId]: dismissed }
    })),
    setActiveDriverRoute: (activeDriverRoute) => set({ activeDriverRoute }),
    setAssignment: (assignment) => set({ assignment }),
    setTripSummary: (summary) => set({ tripSummary: summary }),
    setError: (error) => set({ error }),
    reset: () => set({
        status: 'IDLE',
        tripInstance: null,
        offers: [],
        assignment: null,
        tripSummary: null,
        error: null,
        offersByRoute: {},
        findingRouteIds: {},
        dismissedPanelRouteIds: {},
        activeDriverRoute: null
    })
}));
