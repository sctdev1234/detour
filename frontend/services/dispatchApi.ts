import api from './api';

export interface TripTemplatePayload {
    startPoint: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
        address: string;
    };
    endPoint: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
        address: string;
    };
    schedulingStrategy: 'IMMEDIATE' | 'SCHEDULED' | 'RECURRING';
    scheduleConfig?: any;
    waypoints?: any[];
}

export const dispatchApi = {
    /**
     * Submits a new TripTemplate, effectively starting a ride request.
     */
    requestRide: async (payload: TripTemplatePayload) => {
        const response = await api.post('/v2/dispatch/template', payload);
        return response.data.data; // Unwraps backend { success, data }
    },

    /**
     * Accepts a specific Offer for a TripInstance.
     */
    acceptOffer: async (offerId: string) => {
        const response = await api.post(`/v2/dispatch/offer/${offerId}/accept`);
        return response.data.data; // Unwraps backend { success, data }
    },

    /**
     * Recovers passenger dispatch state on socket reconnect.
     */
    getRecoveryState: async () => {
        const response = await api.get('/v2/dispatch/recovery');
        return response.data.data; // Unwraps backend { success, data }
    },

    /**
     * Cancels the active ride search for the passenger.
     */
    cancelSearch: async (tripInstanceId: string) => {
        const response = await api.post('/v2/dispatch/cancel', { tripInstanceId });
        return response.data.data; // Unwraps backend { success, data }
    }
};
