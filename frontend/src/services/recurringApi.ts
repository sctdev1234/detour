import apiClient from '../../services/api';

export interface RouteGeometry {
    type: string;
    coordinates: number[][];
}

export interface VacationMode {
    active: boolean;
    startDate?: string;
    endDate?: string;
}

export interface RecurringConfig {
    days: string[];
    departureTime: string;
    arrivalTime?: string;
    seatCapacity?: number;
    pricePerSeat?: number;
    currency?: string;
    distanceKm?: number;
    estimatedDurationMin?: number;
    vehicleId?: string;
}

export interface TripTemplate {
    _id: string;
    creatorRole: 'passenger' | 'driver';
    schedulingStrategy: string;
    startPoint: any;
    endPoint: any;
    status: string;
    recurringConfig: RecurringConfig;
    routeGeometry?: RouteGeometry;
    polylineCache?: string;
    vacationMode?: VacationMode;
    linkedTemplates: any[];
}

export const recurringApi = {
    createPassengerRecurring: async (data: any) => {
        const response = await apiClient.post('/v2/recurring/passenger', data);
        return response.data;
    },
    
    createDriverRecurring: async (data: any) => {
        const response = await apiClient.post('/v2/recurring/driver', data);
        return response.data;
    },

    getMyTemplates: async () => {
        const response = await apiClient.get('/v2/recurring/templates');
        return response.data;
    },

    getTemplateDetails: async (id: string) => {
        const response = await apiClient.get(`/v2/recurring/template/${id}`);
        return response.data;
    },

    updateVacationMode: async (id: string, data: VacationMode) => {
        const response = await apiClient.patch(`/v2/recurring/template/${id}/vacation`, data);
        return response.data;
    },

    archiveTemplate: async (id: string) => {
        const response = await apiClient.patch(`/v2/recurring/template/${id}/cancel`);
        return response.data;
    },

    linkTemplates: async (passengerTemplateId: string, driverTemplateId: string, seats: number = 1) => {
        const response = await apiClient.post('/v2/recurring/link', { passengerTemplateId, driverTemplateId, seats });
        return response.data;
    },

    unlinkTemplates: async (passengerTemplateId: string, driverTemplateId: string) => {
        const response = await apiClient.patch('/v2/recurring/link/cancel', { passengerTemplateId, driverTemplateId });
        return response.data;
    },

    searchDriverRoutes: async (passengerTemplateId: string) => {
        const response = await apiClient.get('/v2/recurring/search/drivers', { params: { passengerTemplateId } });
        return response.data;
    }
};
