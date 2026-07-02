import { driverDispatchApi } from '../services/driverDispatchApi';
import { driverDispatchSocket } from '../services/driverDispatchSocket';
import { useDriverDispatchStore, DriverOffer } from './useDriverDispatchStore';
import driverService from '../services/driverService';
import { socketLifecycleManager, ConnectionStatus } from '../services/SocketLifecycleManager';

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
let unsubConnectionStatus: (() => void) | null = null;
let unsubResume: (() => void) | null = null;

export const driverDispatchActions = {
    /**
     * Go Online — start accepting dispatch offers.
     */
    goOnline: async () => {
        const store = useDriverDispatchStore.getState();
        store.setError(null);
        try {
            await driverService.updateStatus('ONLINE');
            store.setPresence('ONLINE');
            store.setAvailability('AVAILABLE');
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
            store.setAvailability('BREAK');
            // Depending on requirements, we might want to unbind sockets or stay connected to see updates
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
            store.setAvailability('AVAILABLE');
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
            // Status stays as BUSY with OFFER_INCOMING until passenger responds
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

            // Update the architectural tripStatus dimension
            const statusMap: Record<string, any> = {
                'EN_ROUTE': 'TO_PICKUP',
                'ARRIVED': 'TO_PICKUP', // Arrived at pickup
                'STARTED': 'ACTIVE',
                'COMPLETED': 'COMPLETED'
            };
            const tripStatus = statusMap[status];
            if (tripStatus) {
                store.setTripStatus(tripStatus);
            }
            
            // Also locally patch the activeTrip status so the view knows if it's Arrived vs En_Route
            if (store.activeTrip) {
                store.setActiveTrip({ ...store.activeTrip, status: status === 'ARRIVED' ? 'ARRIVED_PICKUP' : status });
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
        store.setTripStatus('NONE');
        store.setAvailability('AVAILABLE');
    },

    // ──────────────────────────────────────────────
    // Socket Lifecycle (Internal)
    // ──────────────────────────────────────────────

    _bindSockets: () => {
        driverDispatchActions._unbindSockets(); // Clean slate

        socketLifecycleManager.start();

        unsubConnectionStatus = socketLifecycleManager.addStatusListener((status: ConnectionStatus) => {
            const store = useDriverDispatchStore.getState();
            store.setConnectionStatus(status);
        });

        unsubResume = socketLifecycleManager.addResumeListener(() => {
            // When app comes to foreground, we could poll for missed offers or active trip state here
            // e.g. driverDispatchApi.fetchCurrentState().then(...)
        });

        unsubOffer = driverDispatchSocket.onOfferDispatched((offer: DriverOffer) => {
            const store = useDriverDispatchStore.getState();
            store.setCurrentOffer(offer);
            store.setAvailability('BUSY');
        });

        unsubExpired = driverDispatchSocket.onOfferExpired(({ offerId }) => {
            const store = useDriverDispatchStore.getState();
            if (store.currentOffer?._id === offerId) {
                store.setCurrentOffer(null);
                store.setAvailability('AVAILABLE');
            }
        });

        unsubAssigned = driverDispatchSocket.onTripAssigned((assignment) => {
            const store = useDriverDispatchStore.getState();
            store.setActiveTrip(assignment);
            store.setCurrentOffer(null);
            store.setAvailability('BUSY');
            store.setTripStatus('TO_PICKUP');
        });

        unsubCancelled = driverDispatchSocket.onTripCancelled(() => {
            const store = useDriverDispatchStore.getState();
            store.setActiveTrip(null);
            store.setCurrentOffer(null);
            store.setTripStatus('NONE');
            store.setAvailability('AVAILABLE');
        });

        unsubCounter = driverDispatchSocket.onCounterResponse(({ offerId, accepted, finalPrice }) => {
            const store = useDriverDispatchStore.getState();
            if (accepted) {
                // Passenger accepted — wait for assignment
            } else {
                // Passenger rejected counter — return to online
                store.setCurrentOffer(null);
                store.setAvailability('AVAILABLE');
            }
        });
    },

    _unbindSockets: () => {
        socketLifecycleManager.stop();
        if (unsubConnectionStatus) { unsubConnectionStatus(); unsubConnectionStatus = null; }
        if (unsubResume) { unsubResume(); unsubResume = null; }
        if (unsubOffer) { unsubOffer(); unsubOffer = null; }
        if (unsubExpired) { unsubExpired(); unsubExpired = null; }
        if (unsubAssigned) { unsubAssigned(); unsubAssigned = null; }
        if (unsubCancelled) { unsubCancelled(); unsubCancelled = null; }
        if (unsubCounter) { unsubCounter(); unsubCounter = null; }
    }
};
