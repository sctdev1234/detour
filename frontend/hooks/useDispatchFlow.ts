import { useMemo } from 'react';
import { useDispatchStore } from '../store/useDispatchStore';
import { dispatchActions } from '../store/dispatchActions';
import { TripTemplatePayload } from '../services/dispatchApi';

/**
 * THIN WRAPPER for Presentation Layer
 * Exposes specific parts of the state and actions, keeping components ignorant of API/Sockets/Zustand internals.
 */
export const useDispatchFlow = () => {
    // Select specific state
    const status = useDispatchStore((state) => state.status);
    const offers = useDispatchStore((state) => state.offers);
    const addOffer = useDispatchStore((state) => state.addOffer);
    const assignment = useDispatchStore((state) => state.assignment);
    const tripSummary = useDispatchStore((state) => state.tripSummary);
    const error = useDispatchStore((state) => state.error);

    // Bind actions
    const requestRide = async (payload: TripTemplatePayload) => {
        await dispatchActions.requestRide(payload);
    };

    const acceptOffer = async (offerId: string) => {
        await dispatchActions.acceptOffer(offerId);
    };

    const rejectOffer = async (offerId: string, reason?: string) => {
        await dispatchActions.rejectOffer(offerId, reason);
    };

    const cancelSearch = () => {
        dispatchActions.cancelSearch();
    };

    const finishTripSession = () => {
        dispatchActions.finishTripSession();
    };

    // Derived State
    const isSearching = status === 'SEARCHING';
    const isOffersOpen = status === 'OFFERS_OPEN' || (status === 'SEARCHING' && offers.length > 0);
    const hasOffers = offers.length > 0;
    const isAssigned = status === 'ASSIGNED';
    const isEnRoute = status === 'EN_ROUTE';
    const isDriverArrived = status === 'DRIVER_ARRIVED' || status === 'ARRIVED';
    const isBoarded = status === 'BOARDED';
    const isStarted = status === 'STARTED';
    const isDroppedOff = status === 'DROPPED_OFF';
    const isCompleted = status === 'COMPLETED';

    const tripInstance = useDispatchStore((state) => state.tripInstance);
    const offersByRoute = useDispatchStore((state) => state.offersByRoute);
    const findingRouteIds = useDispatchStore((state) => state.findingRouteIds);
    const dismissedPanelRouteIds = useDispatchStore((state) => state.dismissedPanelRouteIds);
    const activeDriverRoute = useDispatchStore((state) => state.activeDriverRoute);
    const setFindingForRoute = useDispatchStore((state) => state.setFindingForRoute);
    const dismissPanelForRoute = useDispatchStore((state) => state.dismissPanelForRoute);
    const setActiveDriverRoute = useDispatchStore((state) => state.setActiveDriverRoute);
    const otp = assignment?.otp || assignment?.passengerJourney?.verificationOtp || assignment?.verificationOtp;

    return {
        // State
        status,
        tripInstance,
        offers,
        offersByRoute,
        findingRouteIds,
        dismissedPanelRouteIds,
        activeDriverRoute,
        assignment,
        otp,
        tripSummary,
        error,
        
        // Derived state
        isSearching,
        isOffersOpen,
        hasOffers,
        isAssigned,
        isEnRoute,
        isDriverArrived,
        isArrived: isDriverArrived,
        isBoarded,
        isStarted,
        isDroppedOff,
        isCompleted,

        // Actions
        requestRide,
        acceptOffer,
        rejectOffer,
        addOffer,
        cancelSearch,
        finishTripSession,
        setFindingForRoute,
        dismissPanelForRoute,
        setActiveDriverRoute
    };
};
