import { dispatchApi, TripTemplatePayload } from '../services/dispatchApi';
import { dispatchSocket } from '../services/dispatchSocket';
import { useDispatchStore } from './useDispatchStore';

// Keep track of active socket subscriptions so we can clean them up
let unsubscribeOffers: (() => void) | null = null;
let unsubscribeAssignment: (() => void) | null = null;
let unsubscribeTripStatus: (() => void) | null = null;
let unsubResume: (() => void) | null = null;
let unsubConnectionStatus: (() => void) | null = null;

export const dispatchActions = {
    /**
     * Start a new ride request.
     * 1. Calls API to create template.
     * 2. Sets store state to SEARCHING.
     * 3. Subscribes to Socket events for offers.
     */
    requestRide: async (payload: TripTemplatePayload) => {
        const store = useDispatchStore.getState();
        store.reset();
        store.setStatus('SEARCHING');
        store.setError(null);

        try {
            const data = await dispatchApi.requestRide(payload);
            // Setup Instance
            if (data.instances && data.instances.length > 0) {
                store.setTripInstance(data.instances[0]);
            }

            // Bind Socket Listeners
            dispatchActions._bindSockets();

        } catch (error: any) {
            console.error('[dispatchActions] requestRide failed:', error);
            store.setStatus('ERROR');
            store.setError(error.message || 'Failed to request ride');
        }
    },

    /**
     * Accept a specific offer.
     */
    acceptOffer: async (offerId: string) => {
        const store = useDispatchStore.getState();
        try {
            // Optimistic update could go here, but let's wait for the server
            const data = await dispatchApi.acceptOffer(offerId);
            
            // Server responds with Assignment immediately if atomic
            if (data.assignment) {
                store.setAssignment(data.assignment);
                store.setStatus('ASSIGNED');
                // Do not unbind sockets yet, we need to track trip progress
            }
        } catch (error: any) {
            console.error('[dispatchActions] acceptOffer failed:', error);
            store.setError(error.message || 'Failed to accept offer');
            // We do not change status to ERROR completely because they can still try another offer
        }
    },

    /**
     * Cancel the ride search and clean up.
     */
    cancelSearch: () => {
        const store = useDispatchStore.getState();
        store.reset();
        dispatchActions._unbindSockets();
    },

    /**
     * Finish the completed trip session and return to IDLE.
     */
    finishTripSession: () => {
        const store = useDispatchStore.getState();
        store.reset();
        dispatchActions._unbindSockets();
    },

    /**
     * Recover missed state from the unified Recovery API on reconnect.
     */
    recoverState: async () => {
        const store = useDispatchStore.getState();
        try {
            const data = await dispatchApi.getRecoveryState();
            if (!data) return;

            store.setTripInstance(data.tripInstance);
            store.setOffers(data.offers || []);
            store.setAssignment(data.assignment);
            store.setStatus(data.status);
            
            // Re-bind sockets if active
            if (data.status !== 'IDLE' && data.status !== 'COMPLETED' && data.status !== 'CANCELLED') {
                dispatchActions._bindSockets();
            }
        } catch (error) {
            console.error('[dispatchActions] recoverState failed', error);
        }
    },

    _bindSockets: () => {
        const store = useDispatchStore.getState();

        dispatchActions._unbindSockets(); // Ensure clean slate

        const { socketLifecycleManager } = require('../services/SocketLifecycleManager');
        socketLifecycleManager.start();

        // Recover state on reconnection (e.g. server restart while app is active)
        unsubConnectionStatus = socketLifecycleManager.addStatusListener((status: any) => {
            if (status === 'CONNECTED') {
                dispatchActions.recoverState();
            }
        });

        // Register resume listener for explicit hydration (app comes to foreground)
        unsubResume = socketLifecycleManager.addResumeListener(() => {
            dispatchActions.recoverState();
        });

        unsubscribeOffers = dispatchSocket.onOfferReceived((offer) => {
            // Update Zustand Store
            useDispatchStore.getState().addOffer(offer);
            useDispatchStore.getState().setStatus('OFFERS_OPEN');
        });

        unsubscribeAssignment = dispatchSocket.onDriverAssigned((assignment) => {
            // Update Zustand Store
            useDispatchStore.getState().setAssignment(assignment);
            useDispatchStore.getState().setStatus('ASSIGNED');
        });

        unsubscribeTripStatus = dispatchSocket.onTripStatusUpdated((update) => {
            const store = useDispatchStore.getState();
            if (update.status === 'STARTED') {
                store.setStatus('STARTED');
            } else if (update.status === 'EN_ROUTE' || update.status === 'ARRIVED' || update.status === 'COMPLETED' || update.status === 'CANCELLED') {
                store.setStatus(update.status as any);
            }
            if (update.status === 'COMPLETED' && update.tripSummary) {
                store.setTripSummary(update.tripSummary);
            }
        });
    },

    _unbindSockets: () => {
        if (unsubscribeOffers) {
            unsubscribeOffers();
            unsubscribeOffers = null;
        }
        if (unsubscribeAssignment) {
            unsubscribeAssignment();
            unsubscribeAssignment = null;
        }
        if (unsubscribeTripStatus) {
            unsubscribeTripStatus();
            unsubscribeTripStatus = null;
        }
        if (unsubResume) {
            unsubResume();
            unsubResume = null;
        }
        if (unsubConnectionStatus) {
            unsubConnectionStatus();
            unsubConnectionStatus = null;
        }
    }
};
