import { useDriverDispatchStore } from '../store/useDriverDispatchStore';
import { driverDispatchActions } from '../store/driverDispatchActions';

/**
 * THIN WRAPPER for Driver Presentation Layer.
 * Exposes state selectors and bound actions.
 * No business logic lives here.
 */
export const useDriverDispatchFlow = () => {
    const presence = useDriverDispatchStore((s) => s.presence);
    const availability = useDriverDispatchStore((s) => s.availability);
    const tripStatus = useDriverDispatchStore((s) => s.tripStatus);
    const connectionStatus = useDriverDispatchStore((s) => s.connectionStatus);

    const currentOffer = useDriverDispatchStore((s) => s.currentOffer);
    const activeTrip = useDriverDispatchStore((s) => s.activeTrip);
    const tripSummary = useDriverDispatchStore((s) => s.tripSummary);
    const error = useDriverDispatchStore((s) => s.error);

    // Derive unified View Status for backwards compatibility with legacy layout
    let status = 'OFFLINE';
    if (error) {
        status = 'ERROR';
    } else if (presence === 'OFFLINE') {
        status = 'OFFLINE';
    } else if (availability === 'BREAK') {
        status = 'BREAK';
    } else if (tripStatus === 'COMPLETED') {
        status = 'TRIP_COMPLETED';
    } else if (tripStatus === 'ACTIVE') {
        status = 'TRIP_ACTIVE';
    } else if (tripStatus === 'TO_PICKUP') {
        // Distinguish between en-route to pickup and arrived at pickup
        if (activeTrip?.status === 'ARRIVED_PICKUP' || activeTrip?.status === 'ARRIVED') {
            status = 'ARRIVED';
        } else {
            status = 'EN_ROUTE';
        }
    } else if (currentOffer) {
        status = 'OFFER_INCOMING';
    } else if (presence === 'ONLINE' && availability === 'AVAILABLE') {
        status = 'ONLINE';
    } else {
        // Fallback for edge states
        status = 'ONLINE';
    }

    return {
        // State
        status,
        presence,
        availability,
        tripStatus,
        connectionStatus,
        currentOffer,
        activeTrip,
        tripSummary,
        error,

        // Derived
        isOnline: status === 'ONLINE',
        isOffline: status === 'OFFLINE',
        isOnBreak: status === 'BREAK',
        hasIncomingOffer: status === 'OFFER_INCOMING',
        isEnRoute: status === 'EN_ROUTE',
        hasArrived: status === 'ARRIVED',
        isTripActive: status === 'TRIP_ACTIVE',
        isTripCompleted: status === 'TRIP_COMPLETED',

        // Actions (delegated to action module)
        goOnline: driverDispatchActions.goOnline,
        goOffline: driverDispatchActions.goOffline,
        takeBreak: driverDispatchActions.takeBreak,
        acceptOffer: driverDispatchActions.acceptOffer,
        rejectOffer: driverDispatchActions.rejectOffer,
        counterOffer: driverDispatchActions.counterOffer,
        updateTripStatus: driverDispatchActions.updateTripStatus,
        dismissSummary: driverDispatchActions.dismissSummary
    };
};
