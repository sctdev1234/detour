import { driverDispatchApi } from '../services/driverDispatchApi';
import { driverDispatchSocket } from '../services/driverDispatchSocket';
import { useDriverDispatchStore, DriverOffer } from './useDriverDispatchStore';
import driverService from '../services/driverService';

/**
 * Driver Dispatch Actions — business logic module.
 * Orchestrates API calls, socket subscriptions, and store mutations.
 * Components never call these directly — they go through useDriverDispatchFlow.
 */

let unsubOffer: (() => void) | null = null;
let unsubExpired: (() => void) | null = null;
let unsubAssigned: (() => void) | null = null;
let unsubCancelled: (() => void) | null = null;
let unsubCounter: (() => void) | null = null;

export const driverDispatchActions = {
    /**
     * Go Online — start accepting dispatch offers.
     */
    goOnline: async () => {
        const store = useDriverDispatchStore.getState();
        store.setError(null);
        try {
            await driverService.updateStatus('ONLINE');
            store.setStatus('ONLINE');
            driverDispatchActions._bindSockets();
        } catch (error: any) {
            store.setError(error.message || 'Failed to go online');
        }
    },

    /**
     * Go Offline — stop accepting dispatch offers.
     */
    goOffline: async () => {
        const store = useDriverDispatchStore.getState();
        try {
            await driverService.updateStatus('OFFLINE');
            driverDispatchActions._unbindSockets();
            store.reset();
        } catch (error: any) {
            store.setError(error.message || 'Failed to go offline');
        }
    },

    /**
     * Take Break — temporarily pause dispatch.
     */
    takeBreak: async () => {
        const store = useDriverDispatchStore.getState();
        try {
            await driverService.updateStatus('BREAK');
            store.setStatus('BREAK');
            driverDispatchActions._unbindSockets();
        } catch (error: any) {
            store.setError(error.message || 'Failed to set break');
        }
    },

    /**
     * Accept an incoming offer.
     */
    acceptOffer: async (offerId: string) => {
        const store = useDriverDispatchStore.getState();
        store.setError(null);
        try {
            await driverDispatchApi.acceptOffer(offerId);
            // Wait for socket event 'dispatch:trip_assigned_to_driver' to transition state
        } catch (error: any) {
            store.setError(error.message || 'Failed to accept offer');
        }
    },

    /**
     * Reject an incoming offer.
     */
    rejectOffer: async (offerId: string, reason?: string) => {
        const store = useDriverDispatchStore.getState();
        store.setError(null);
        try {
            await driverDispatchApi.rejectOffer(offerId, reason);
            store.setCurrentOffer(null);
            store.setStatus('ONLINE');
        } catch (error: any) {
            store.setError(error.message || 'Failed to reject offer');
        }
    },

    /**
     * Submit counter-offer.
     */
    counterOffer: async (offerId: string, counterPrice: number) => {
        const store = useDriverDispatchStore.getState();
        store.setError(null);
        try {
            await driverDispatchApi.counterOffer(offerId, counterPrice);
            // Status stays as OFFER_INCOMING until passenger responds
        } catch (error: any) {
            store.setError(error.message || 'Failed to submit counter-offer');
        }
    },

    /**
     * Update trip status (driver-initiated transitions).
     */
    updateTripStatus: async (tripInstanceId: string, status: string) => {
        const store = useDriverDispatchStore.getState();
        store.setError(null);
        try {
            await driverDispatchApi.updateTripStatus(tripInstanceId, status);

            // Map API status to driver dispatch status
            const statusMap: Record<string, any> = {
                'EN_ROUTE': 'EN_ROUTE',
                'ARRIVED': 'ARRIVED',
                'STARTED': 'TRIP_ACTIVE',
                'COMPLETED': 'TRIP_COMPLETED'
            };
            const driverStatus = statusMap[status];
            if (driverStatus) {
                store.setStatus(driverStatus);
            }
        } catch (error: any) {
            store.setError(error.message || 'Failed to update trip status');
        }
    },

    /**
     * Complete the post-trip flow (dismiss summary, return to online).
     */
    dismissSummary: () => {
        const store = useDriverDispatchStore.getState();
        store.setTripSummary(null);
        store.setActiveTrip(null);
        store.setCurrentOffer(null);
        store.setStatus('ONLINE');
    },

    // ──────────────────────────────────────────────
    // Socket Lifecycle (Internal)
    // ──────────────────────────────────────────────

    _bindSockets: () => {
        driverDispatchActions._unbindSockets(); // Clean slate

        unsubOffer = driverDispatchSocket.onOfferDispatched((offer: DriverOffer) => {
            const store = useDriverDispatchStore.getState();
            store.setCurrentOffer(offer);
            store.setStatus('OFFER_INCOMING');
        });

        unsubExpired = driverDispatchSocket.onOfferExpired(({ offerId }) => {
            const store = useDriverDispatchStore.getState();
            if (store.currentOffer?._id === offerId) {
                store.setCurrentOffer(null);
                store.setStatus('ONLINE');
            }
        });

        unsubAssigned = driverDispatchSocket.onTripAssigned((assignment) => {
            const store = useDriverDispatchStore.getState();
            store.setActiveTrip(assignment);
            store.setCurrentOffer(null);
            store.setStatus('EN_ROUTE');
        });

        unsubCancelled = driverDispatchSocket.onTripCancelled(() => {
            const store = useDriverDispatchStore.getState();
            store.setActiveTrip(null);
            store.setCurrentOffer(null);
            store.setStatus('ONLINE');
        });

        unsubCounter = driverDispatchSocket.onCounterResponse(({ offerId, accepted, finalPrice }) => {
            const store = useDriverDispatchStore.getState();
            if (accepted) {
                // Passenger accepted — wait for assignment
            } else {
                // Passenger rejected counter — return to online
                store.setCurrentOffer(null);
                store.setStatus('ONLINE');
            }
        });
    },

    _unbindSockets: () => {
        if (unsubOffer) { unsubOffer(); unsubOffer = null; }
        if (unsubExpired) { unsubExpired(); unsubExpired = null; }
        if (unsubAssigned) { unsubAssigned(); unsubAssigned = null; }
        if (unsubCancelled) { unsubCancelled(); unsubCancelled = null; }
        if (unsubCounter) { unsubCounter(); unsubCounter = null; }
    }
};
