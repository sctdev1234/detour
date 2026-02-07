import { create } from 'zustand';
import api from '../services/api';

export type RideRequest = {
    _id?: string;
    userId?: string;
    pickup: { lat: number; lng: number; address: string };
    destination: { lat: number; lng: number; address: string };
    schedule: { days: string[]; time: string };
    status?: 'pending' | 'matched' | 'completed' | 'cancelled';
};

export type LatLng = {
    latitude: number;
    longitude: number;
    address?: string;
};

export type TripData = {
    carId: string;
    startPoint: LatLng;
    endPoint: LatLng;
    waypoints: LatLng[];
    timeStart: string;
    timeArrival: string;
    days: string[];
    price: number;
    priceType: 'fix' | 'km';
    status: string;
    driverId?: string;
    driverName?: string;
    profilePhoto?: string;
    passengers?: any[];
    distanceKm?: number;
    estimatedDurationMin?: number;
    routeGeometry?: string;
};

export type Trip = TripData & {
    id: string;
};

interface TripState {
    currentRequest: RideRequest | null;
    matches: any[];
    trips: Trip[];
    isLoading: boolean;
    searchResults: Trip[];
    createRequest: (data: Partial<RideRequest>) => Promise<void>;
    addTrip: (data: TripData) => Promise<void>;
    fetchTrips: () => Promise<void>;
    searchTrips: (params: { pickup: LatLng; destination: LatLng; days?: string[]; time?: string }) => Promise<void>;
    removeTrip: (tripId: string) => Promise<void>;
    findMatches: (requestId: string) => Promise<void>;
    confirmTrip: (rideRequestId: string, driverId: string, price: number) => Promise<void>;
}

export const useTripStore = create<TripState>((set) => ({
    currentRequest: null,
    matches: [],
    trips: [],
    searchResults: [],
    isLoading: false,

    createRequest: async (data: Partial<RideRequest>) => {
        set({ isLoading: true });
        try {
            const res = await api.post('/trip/request', data);
            set({ currentRequest: res.data, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    addTrip: async (tripData: TripData) => {
        set({ isLoading: true });
        try {
            const res = await api.post('/trip/route', tripData);
            const newTrip: Trip = {
                ...tripData,
                id: res.data._id
            };
            set((state) => ({
                trips: [newTrip, ...state.trips],
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    fetchTrips: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get('/trip/route');
            const formattedTrips: Trip[] = res.data.map((item: any) => ({
                id: item._id,
                carId: item.carId,
                driverId: item.userId,
                passengers: item.passengers || [],
                startPoint: {
                    latitude: item.startPoint?.coordinates?.[1] || item.startPoint?.latitude,
                    longitude: item.startPoint?.coordinates?.[0] || item.startPoint?.longitude,
                    address: item.startPoint?.address
                },
                endPoint: {
                    latitude: item.endPoint?.coordinates?.[1] || item.endPoint?.latitude,
                    longitude: item.endPoint?.coordinates?.[0] || item.endPoint?.longitude,
                    address: item.endPoint?.address
                },
                waypoints: (item.waypoints || []).map((wp: any) => ({
                    latitude: wp.coordinates?.[1] || wp.latitude,
                    longitude: wp.coordinates?.[0] || wp.longitude,
                    address: wp.address
                })),
                timeStart: item.schedule?.time || '',
                timeArrival: item.schedule?.timeArrival || '',
                days: item.schedule?.days || [],
                price: item.price?.amount || 0,
                priceType: item.price?.type || 'fix',
                status: item.isActive ? 'active' : 'inactive',
                distanceKm: item.distanceKm,
                estimatedDurationMin: item.estimatedDurationMin,
                routeGeometry: item.routeGeometry
            }));
            set({ trips: formattedTrips, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            console.error('Failed to fetch trips', error);
        }
    },

    searchTrips: async (params) => {
        set({ isLoading: true });
        try {
            const res = await api.post('/trip/search', params);
            const formattedResults: Trip[] = res.data.map((item: any) => ({
                id: item._id,
                carId: item.carId,
                driverId: item.userId?._id || item.userId,
                driverName: item.userId?.fullName || 'Driver',
                passengers: item.passengers || [],
                profilePhoto: item.userId?.photoURL,
                startPoint: {
                    latitude: item.startPoint?.coordinates[1],
                    longitude: item.startPoint?.coordinates[0],
                    address: item.startPoint?.address
                },
                endPoint: {
                    latitude: item.endPoint?.coordinates[1],
                    longitude: item.endPoint?.coordinates[0],
                    address: item.endPoint?.address
                },
                waypoints: (item.waypoints || []).map((wp: any) => ({
                    latitude: wp.coordinates?.[1],
                    longitude: wp.coordinates?.[0],
                    address: wp.address
                })),
                timeStart: item.schedule?.time || '',
                timeArrival: item.schedule?.timeArrival || '',
                days: item.schedule?.days || [],
                price: item.price?.amount || 0,
                priceType: item.price?.type || 'fix',
                status: item.isActive ? 'active' : 'inactive',
                distanceKm: item.distanceKm,
                estimatedDurationMin: item.estimatedDurationMin,
                routeGeometry: item.routeGeometry
            }));
            set({ searchResults: formattedResults, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            console.error('Failed to search trips', error);
            throw error;
        }
    },

    removeTrip: async (tripId: string) => {
        set({ isLoading: true });
        try {
            await api.delete(`/trip/route/${tripId}`);
            set((state) => ({
                trips: state.trips.filter(t => t.id !== tripId),
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            console.error('Failed to remove trip', error);
            throw error;
        }
    },

    findMatches: async (requestId: string) => {
        set({ isLoading: true });
        try {
            const res = await api.get(`/trip/matches/${requestId}`);
            set({ matches: res.data, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    confirmTrip: async (rideRequestId: string, driverId: string, price: number) => {
        set({ isLoading: true });
        try {
            await api.post('/trip/confirm', { rideRequestId, driverId, price });
            set({ isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },
}));
