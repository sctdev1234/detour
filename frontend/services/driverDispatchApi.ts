import api from './api';

/**
 * Driver-facing API calls for the V2 Dispatch pipeline.
 * Stateless service — no side-effects beyond the HTTP call.
 */
export const driverDispatchApi = {
    /** Fetch pending offers for the authenticated driver. */
    getOffers: async () => {
        const response = await api.get('/v2/dispatch/driver/offers');
        return response.data;
    },

    /** Driver accepts an offer. */
    acceptOffer: async (offerId: string) => {
        const response = await api.post(`/v2/dispatch/driver/offer/${offerId}/accept`);
        return response.data;
    },

    /** Driver rejects an offer. */
    rejectOffer: async (offerId: string, reason?: string) => {
        const response = await api.post(`/v2/dispatch/driver/offer/${offerId}/reject`, { reason });
        return response.data;
    },

    /** Driver submits a counter-offer (price negotiation). */
    counterOffer: async (offerId: string, counterPrice: number) => {
        const response = await api.post(`/v2/dispatch/driver/offer/${offerId}/counter`, { counterPrice });
        return response.data;
    },

    /** Fetch the active trip assignment for the driver. */
    getActiveTrip: async () => {
        const response = await api.get('/v2/dispatch/driver/active');
        return response.data;
    },

    /** Update trip status (EN_ROUTE, ARRIVED, STARTED, COMPLETED). */
    updateTripStatus: async (tripInstanceId: string, status: string) => {
        const response = await api.patch(`/v2/dispatch/driver/trip/${tripInstanceId}/status`, { status });
        return response.data;
    }
};
