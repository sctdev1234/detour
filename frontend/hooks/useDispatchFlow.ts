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

    const cancelSearch = () => {
        dispatchActions.cancelSearch();
    };

    const finishTripSession = () => {
        dispatchActions.finishTripSession();
    };

    // Derived State
    const isSearching = status === 'SEARCHING';
    const hasOffers = offers.length > 0;
    const isAssigned = status === 'ASSIGNED';
    const isEnRoute = status === 'EN_ROUTE';
    const isArrived = status === 'ARRIVED';
    const isStarted = status === 'IN_PROGRESS';
    const isCompleted = status === 'COMPLETED';

    return {
        // State
        status,
        offers,
        assignment,
        tripSummary,
        error,
        
        // Derived state
        isSearching,
        hasOffers,
        isAssigned,
        isEnRoute,
        isArrived,
        isStarted,
        isCompleted,

        // Actions
        requestRide,
        acceptOffer,
        cancelSearch,
        finishTripSession
    };
};
