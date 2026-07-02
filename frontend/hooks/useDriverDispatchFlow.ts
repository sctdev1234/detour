import { useDriverDispatchStore } from '../store/useDriverDispatchStore';
import { driverDispatchActions } from '../store/driverDispatchActions';

/**
 * THIN WRAPPER for Driver Presentation Layer.
 * Exposes state selectors and bound actions.
 * No business logic lives here.
 */
export const useDriverDispatchFlow = () => {
    const status = useDriverDispatchStore((s) => s.status);
    const currentOffer = useDriverDispatchStore((s) => s.currentOffer);
    const activeTrip = useDriverDispatchStore((s) => s.activeTrip);
    const tripSummary = useDriverDispatchStore((s) => s.tripSummary);
    const error = useDriverDispatchStore((s) => s.error);

    return {
        // State
        status,
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
