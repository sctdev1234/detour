import { driverDispatchApi } from '../services/driverDispatchApi';
import { driverDispatchSocket } from '../services/driverDispatchSocket';
import { useDriverDispatchStore, DriverOffer } from './useDriverDispatchStore';
import { useDashboardStore } from './useDashboardStore';
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

let isRecovering = false;

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
            useDashboardStore.getState().setDriverStatus('ONLINE');
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
            useDashboardStore.getState().setDriverStatus('OFFLINE');
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
            useDashboardStore.getState().setDriverStatus('OFFLINE');
            // Depending on requirements, we might want to unbind sockets or stay connected to see updates
            driverDispatchActions._unbindSockets();
        } catch (error: any) {
            store.setError(error.message || 'Failed to take break');
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
                'EN_ROUTE': 'EN_ROUTE',
                'ARRIVED': 'ARRIVED',
                'STARTED': 'STARTED',
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

    /**
     * Recover missed state from the unified Recovery API.
     * Useful on resume or when a sequence gap is detected.
     */
    recoverState: async () => {
        if (isRecovering) return;
        isRecovering = true;
        const store = useDriverDispatchStore.getState();
        try {
            const data = await driverDispatchApi.getRecoveryState();
            store.setPresence(data.presence);
            store.setAvailability(data.availability);
            store.setTripStatus(data.tripStatus);
            store.setActiveTrip(data.activeTrip);
            store.setCurrentOffer(data.currentOffer);
            store.setLastSequenceNumber(data.lastSequenceNumber || 0);

            // Once recovered, re-bind sockets with the latest sequence number
            driverDispatchActions._bindSockets();
        } catch (error: any) {
            console.error('[DriverDispatchActions] Recovery failed', error);
        } finally {
            isRecovering = false;
        }
    },

    // ──────────────────────────────────────────────
    // Socket Lifecycle (Internal)
    // ──────────────────────────────────────────────

    _bindSockets: () => {
        driverDispatchActions._unbindSockets(); // Clean slate

        socketLifecycleManager.start();

        const currentSeq = useDriverDispatchStore.getState().lastSequenceNumber;

        let prevStatus: ConnectionStatus | null = null;
        unsubConnectionStatus = socketLifecycleManager.addStatusListener((status: ConnectionStatus) => {
            const store = useDriverDispatchStore.getState();
            store.setConnectionStatus(status);
            
            // If we just reconnected, trigger a recovery
            if (status === 'CONNECTED' && prevStatus && prevStatus !== 'CONNECTED') {
                driverDispatchActions.recoverState();
            }
            prevStatus = status;
        });

        unsubResume = socketLifecycleManager.addResumeListener(() => {
            driverDispatchActions.recoverState();
        });

        const updateSeq = (data: any) => {
            if (data && typeof data.seq === 'number') {
                useDriverDispatchStore.getState().setLastSequenceNumber(data.seq);
            }
        };

        const handleGap = () => {
            driverDispatchActions.recoverState();
        };

        unsubOffer = driverDispatchSocket.onSequenceGap(handleGap);

        const offerUnsub = driverDispatchSocket.onOfferDispatched(currentSeq, (offer: any) => {
            updateSeq(offer);
            const store = useDriverDispatchStore.getState();
            store.setCurrentOffer(offer);
            store.setAvailability('BUSY');
        });

        const expiredUnsub = driverDispatchSocket.onOfferExpired(currentSeq, (data: { offerId: string, seq?: number }) => {
            updateSeq(data);
            const store = useDriverDispatchStore.getState();
            if (store.currentOffer?._id === data.offerId) {
                store.setCurrentOffer(null);
                store.setAvailability('AVAILABLE');
            }
        });

        const assignedUnsub = driverDispatchSocket.onTripAssigned(currentSeq, (assignment: any) => {
            updateSeq(assignment);
            const store = useDriverDispatchStore.getState();
            store.setActiveTrip(assignment);
            store.setCurrentOffer(null);
            store.setAvailability('BUSY');
            store.setTripStatus('EN_ROUTE');
        });

        const cancelledUnsub = driverDispatchSocket.onTripCancelled(currentSeq, (data: any) => {
            updateSeq(data);
            const store = useDriverDispatchStore.getState();
            store.setActiveTrip(null);
            store.setCurrentOffer(null);
            store.setTripStatus('NONE');
            store.setAvailability('AVAILABLE');
        });

        const counterUnsub = driverDispatchSocket.onCounterResponse(currentSeq, (data: any) => {
            updateSeq(data);
            const store = useDriverDispatchStore.getState();
            if (data.accepted) {
                // Passenger accepted — wait for assignment
            } else {
                // Passenger rejected counter — return to online
                store.setCurrentOffer(null);
                store.setAvailability('AVAILABLE');
            }
        });

        // We wrap the unsubs so we can clear them easily
        unsubOffer = () => {
            driverDispatchSocket.onSequenceGap(() => {})();
            offerUnsub();
            expiredUnsub();
            assignedUnsub();
            cancelledUnsub();
            counterUnsub();
        };
    },

    _unbindSockets: () => {
        if (unsubConnectionStatus) { unsubConnectionStatus(); unsubConnectionStatus = null; }
        if (unsubResume) { unsubResume(); unsubResume = null; }
        if (unsubOffer) { unsubOffer(); unsubOffer = null; }
    }
};
