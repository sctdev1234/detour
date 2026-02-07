import { create } from 'zustand';
import api from '../services/api';

export type LatLng = {
    latitude: number;
    longitude: number;
    address?: string;
};

export type RouteData = {
    role: 'driver' | 'client';
    carId?: string;
    startPoint: LatLng;
    endPoint: LatLng;
    waypoints: LatLng[];
    timeStart: string;
    timeArrival: string;
    days: string[];
    price: number;
    priceType: 'fix' | 'km';
    status: string;
    routeGeometry?: string;
    distanceKm?: number;
    estimatedDurationMin?: number;
};

export type Route = RouteData & {
    id: string;
    userId: string;
};

export type Trip = {
    id: string;
    driverId: {
        _id: string;
        fullName: string;
        photoURL?: string;
    };
    routeId: Route;
    clients: Array<{
        userId: {
            _id: string;
            fullName: string;
            photoURL?: string;
        };
        routeId: Route;
    }>;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    createdAt: string;
};

export type JoinRequest = {
    id: string;
    clientId: any;
    clientRouteId: any;
    tripId: any;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
};

interface TripState {
    routes: Route[];
    trips: Trip[];
    driverRequests: JoinRequest[];
    clientRequests: JoinRequest[];
    matches: Array<{ route: Route, trip: Trip }>;
    isLoading: boolean;

    // Route Actions
    addRoute: (data: RouteData) => Promise<void>;
    fetchRoutes: () => Promise<void>;
    removeRoute: (routeId: string) => Promise<void>;

    // Matching Actions
    findMatches: (routeId: string) => Promise<void>;

    // Request Actions
    sendJoinRequest: (clientRouteId: string, tripId: string) => Promise<void>;
    handleJoinRequest: (requestId: string, status: 'accepted' | 'rejected') => Promise<void>;
    fetchDriverRequests: () => Promise<void>;
    fetchClientRequests: () => Promise<void>;

    // Trip Actions
    fetchTrips: () => Promise<void>;
}

export const useTripStore = create<TripState>((set) => ({
    routes: [],
    trips: [],
    driverRequests: [],
    clientRequests: [],
    matches: [],
    isLoading: false,

    addRoute: async (data: RouteData) => {
        set({ isLoading: true });
        try {
            const res = await api.post('/trip/route', data);
            const newRoute: Route = {
                ...data,
                id: res.data._id,
                userId: res.data.userId
            };
            set((state) => ({
                routes: [newRoute, ...state.routes],
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    fetchRoutes: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get('/trip/route');
            const formattedRoutes: Route[] = res.data.map((item: any) => ({
                id: item._id,
                userId: item.userId,
                role: item.role,
                carId: item.carId,
                startPoint: {
                    latitude: item.startPoint?.coordinates?.[1],
                    longitude: item.startPoint?.coordinates?.[0],
                    address: item.startPoint?.address
                },
                endPoint: {
                    latitude: item.endPoint?.coordinates?.[1],
                    longitude: item.endPoint?.coordinates?.[0],
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
                status: item.status,
                distanceKm: item.distanceKm,
                estimatedDurationMin: item.estimatedDurationMin,
                routeGeometry: item.routeGeometry
            }));
            set({ routes: formattedRoutes, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            console.error('Failed to fetch routes', error);
        }
    },

    removeRoute: async (routeId: string) => {
        set({ isLoading: true });
        try {
            await api.delete(`/trip/route/${routeId}`);
            set((state) => ({
                routes: state.routes.filter(r => r.id !== routeId),
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    findMatches: async (routeId: string) => {
        set({ isLoading: true });
        try {
            const res = await api.get(`/trip/matches/${routeId}`);
            // Normalize matches (route and trip)
            const formattedMatches = res.data.map((m: any) => ({
                route: {
                    id: m.route._id,
                    userId: m.route.userId?._id || m.route.userId,
                    role: 'driver',
                    carId: m.route.carId,
                    startPoint: {
                        latitude: m.route.startPoint?.coordinates?.[1],
                        longitude: m.route.startPoint?.coordinates?.[0],
                        address: m.route.startPoint?.address
                    },
                    endPoint: {
                        latitude: m.route.endPoint?.coordinates?.[1],
                        longitude: m.route.endPoint?.coordinates?.[0],
                        address: m.route.endPoint?.address
                    },
                    // Add other fields as needed for display
                    days: m.route.schedule?.days || [],
                    timeStart: m.route.schedule?.time || '',
                    price: m.route.price?.amount || 0,
                    priceType: m.route.price?.type || 'fix',
                    routeGeometry: m.route.routeGeometry
                },
                trip: m.trip ? { id: m.trip._id, status: m.trip.status } : null
            }));
            set({ matches: formattedMatches, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    sendJoinRequest: async (clientRouteId: string, tripId: string) => {
        set({ isLoading: true });
        try {
            await api.post('/trip/request-join', { clientRouteId, tripId });
            set({ isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    handleJoinRequest: async (requestId: string, status: 'accepted' | 'rejected') => {
        set({ isLoading: true });
        try {
            await api.post('/trip/handle-request', { requestId, status });
            set((state) => ({
                driverRequests: state.driverRequests.filter(r => r.id !== requestId),
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    fetchDriverRequests: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get('/trip/requests/driver');
            set({
                driverRequests: res.data.map((r: any) => ({
                    id: r._id,
                    clientId: r.clientId,
                    clientRouteId: r.clientRouteId,
                    tripId: r.tripId,
                    status: r.status,
                    createdAt: r.createdAt
                })),
                isLoading: false
            });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    fetchClientRequests: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get('/trip/requests/client');
            set({
                clientRequests: res.data.map((r: any) => ({
                    id: r._id,
                    clientId: r.clientId,
                    clientRouteId: r.clientRouteId,
                    tripId: r.tripId,
                    status: r.status,
                    createdAt: r.createdAt
                })),
                isLoading: false
            });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    fetchTrips: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get('/trip/all');
            set({ trips: res.data, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
        }
    },
}));
