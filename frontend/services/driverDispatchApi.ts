import api from './api';

/**
 * Driver-facing API calls for the V2 Dispatch pipeline.
 * Stateless service — no side-effects beyond the HTTP call.
 */
export const driverDispatchApi = {
    /** Fetch pending offers for the authenticated driver. */
    getOffers: async () => {
        const response = await api.get('/v2/dispatch/driver/offers');
        return response.data.data;
    },

    /** Driver accepts an offer. */
    acceptOffer: async (offerId: string) => {
        const response = await api.post(`/v2/dispatch/driver/offer/${offerId}/accept`);
        return response.data.data;
    },

    /** Driver rejects an offer. */
    rejectOffer: async (offerId: string, reason?: string) => {
        const response = await api.post(`/v2/dispatch/driver/offer/${offerId}/reject`, { reason });
        return response.data.data;
    },

    /** Driver submits a counter-offer (price negotiation). */
    counterOffer: async (offerId: string, counterPrice: number) => {
        const response = await api.post(`/v2/dispatch/driver/offer/${offerId}/counter`, { counterPrice });
        return response.data.data;
    },

    /** Fetch the active trip assignment for the driver. */
    getActiveTrip: async () => {
        const response = await api.get('/v2/dispatch/driver/active');
        return response.data.data;
    },

    /** Update trip status (EN_ROUTE, ARRIVED). Direct BOARDED/COMPLETED forbidden. */
    updateTripStatus: async (tripInstanceId: string, status: 'EN_ROUTE' | 'ARRIVED' | string) => {
        const response = await api.patch(`/v2/dispatch/driver/trip/${tripInstanceId}/status`, { status });
        return response.data.data;
    },

    /** Canonical boarding: Validate passenger OTP and transition to BOARDED. */
    boardPassenger: async (tripInstanceId: string, otp: string, journeyId?: string) => {
        const response = await api.post(`/v2/dispatch/driver/trip/${tripInstanceId}/board`, { otp, journeyId });
        return response.data.data;
    },

    /** Canonical dropoff: Drop off passenger and trigger settlement + completion. */
    dropoffPassenger: async (tripInstanceId: string, journeyId?: string) => {
        const response = await api.post(`/v2/dispatch/driver/trip/${tripInstanceId}/dropoff`, { journeyId });
        return response.data.data;
    },

    /** Fetch the unified recovery state for reconnect/resume. */
    getRecoveryState: async () => {
        const response = await api.get('/v2/dispatch/driver/recovery');
        return response.data.data;
    },

    /** Driver proposes/creates an invitation offer to a matched passenger */
    invitePassenger: async (params: {
        clientRouteId?: string;
        tripInstanceId?: string;
        driverRouteId?: string;
        tripId?: string;
        proposedPrice?: number;
    }) => {
        const response = await api.post('/v2/dispatch/driver/invite-passenger', params);
        return response.data;
    }
};

