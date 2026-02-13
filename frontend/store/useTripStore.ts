import { create } from 'zustand';
import api from '../services/api';

import { JoinRequest, LatLng, Route, RouteData, Trip } from '../types';

interface TripState {
    routes: Route[];
    trips: Trip[];
    driverRequests: JoinRequest[];
    clientRequests: JoinRequest[];
    searchResults: any[]; // Flattened structure for UI: { id, driverName, price, ... }
    matches: Array<{ route: Route, trip: Trip }>; // Keep raw matches if needed, or remove? Let's keep for now but search.tsx uses searchResults.
    isLoading: boolean;

    // Route Actions
    addRoute: (data: RouteData) => Promise<Route>;
    fetchRoutes: () => Promise<void>;
    removeRoute: (routeId: string) => Promise<void>;

    // Matching Actions
    findMatches: (routeId: string) => Promise<void>;
    searchTrips: (criteria: { pickup: LatLng, destination: LatLng }) => Promise<void>;

    // Request Actions
    sendJoinRequest: (clientRouteId: string, tripId: string) => Promise<void>;
    handleJoinRequest: (requestId: string, status: 'accepted' | 'rejected') => Promise<void>;
    fetchDriverRequests: () => Promise<void>;
    fetchClientRequests: () => Promise<void>;

    // Trip Actions
    fetchTrips: () => Promise<void>;
    startTrip: (tripId: string) => Promise<void>;
    completeTrip: (tripId: string) => Promise<void>;
    removeClient: (tripId: string, clientId: string) => Promise<void>;
}

export const useTripStore = create<TripState>((set) => ({
    routes: [],
    trips: [],
    driverRequests: [],
    clientRequests: [],
    searchResults: [],
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
            return newRoute;
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

    searchTrips: async ({ pickup, destination }: { pickup: LatLng, destination: LatLng }) => {
        set({ isLoading: true });
        try {
            // 1. Create a temporary Client Route
            const routeData = {
                role: 'client',
                startPoint: pickup,
                endPoint: destination,
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], // Default to weekdays or get from UI
                timeStart: '08:00', // Default or get from UI
                // Add dummy values for required fields
                waypoints: [],
                timeArrival: '09:00',
                price: 0,
                priceType: 'fix'
            };

            // @ts-ignore
            const resRoute = await api.post('/trip/route', routeData);
            const clientRouteId = resRoute.data._id;

            // 2. Find Matches
            const resMatches = await api.get(`/trip/matches/${clientRouteId}`);

            // 3. Format as searchResults (Flattened for UI)
            const results = resMatches.data.map((m: any) => ({
                id: m.trip?._id || 'no-trip-id', // Use Trip ID for joining
                driverName: m.route.userId?.fullName || 'Unknown Driver',
                profilePhoto: m.route.userId?.photoURL,
                carId: m.route.carId,
                price: m.route.price?.amount || 0,
                priceType: m.route.price?.type || 'fix',
                timeStart: m.route.schedule?.time || '',
                startPoint: m.route.startPoint,
                endPoint: m.route.endPoint,
                routeId: m.route._id, // Keep route ID ref
                distanceKm: m.route.distanceKm
            }));

            set({ searchResults: results, isLoading: false });

        } catch (error) {
            set({ isLoading: false });
            console.error('Search trips failed:', error);
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
            const formattedTrips: Trip[] = res.data.map((t: any) => ({
                id: t._id,
                driverId: t.driverId,
                status: t.status,
                createdAt: t.createdAt,
                routeId: {
                    id: t.routeId?._id,
                    userId: t.routeId?.userId,
                    role: t.routeId?.role,
                    carId: t.routeId?.carId,
                    startPoint: {
                        latitude: t.routeId?.startPoint?.coordinates?.[1],
                        longitude: t.routeId?.startPoint?.coordinates?.[0],
                        address: t.routeId?.startPoint?.address
                    },
                    endPoint: {
                        latitude: t.routeId?.endPoint?.coordinates?.[1],
                        longitude: t.routeId?.endPoint?.coordinates?.[0],
                        address: t.routeId?.endPoint?.address
                    },
                    waypoints: (t.routeId?.waypoints || []).map((wp: any) => ({
                        latitude: wp.coordinates?.[1],
                        longitude: wp.coordinates?.[0],
                        address: wp.address
                    })),
                    timeStart: t.routeId?.schedule?.time || '',
                    timeArrival: t.routeId?.schedule?.timeArrival || '',
                    days: t.routeId?.schedule?.days || [],
                    price: t.routeId?.price?.amount || 0,
                    priceType: t.routeId?.price?.type || 'fix',
                    distanceKm: t.routeId?.distanceKm,
                    estimatedDurationMin: t.routeId?.estimatedDurationMin,
                    routeGeometry: t.routeId?.routeGeometry,
                    status: t.routeId?.status
                },
                clients: (t.clients || []).map((c: any) => ({
                    userId: c.userId,
                    routeId: {
                        // Minimal route mapping for client route if needed, or full
                        id: c.routeId?._id,
                        userId: c.routeId?.userId, // usually same as client userId
                        startPoint: c.routeId?.startPoint ? {
                            latitude: c.routeId.startPoint.coordinates[1],
                            longitude: c.routeId.startPoint.coordinates[0],
                            address: c.routeId.startPoint.address
                        } : undefined,
                        endPoint: c.routeId?.endPoint ? {
                            latitude: c.routeId.endPoint.coordinates[1],
                            longitude: c.routeId.endPoint.coordinates[0],
                            address: c.routeId.endPoint.address
                        } : undefined,
                        // Add other fields if necessary
                    }
                }))
            }));
            set({ trips: formattedTrips, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    startTrip: async (tripId: string) => {
        set({ isLoading: true });
        try {
            const res = await api.patch(`/trip/${tripId}/start`);
            set((state) => ({
                trips: state.trips.map(t => t.id === tripId ? { ...t, status: 'active' } : t),
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    completeTrip: async (tripId: string) => {
        set({ isLoading: true });
        try {
            const res = await api.patch(`/trip/${tripId}/complete`);
            set((state) => ({
                trips: state.trips.map(t => t.id === tripId ? { ...t, status: 'completed' } : t),
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    removeClient: async (tripId: string, clientId: string) => {
        set({ isLoading: true });
        try {
            await api.delete(`/trip/${tripId}/client/${clientId}`);
            set((state) => ({
                trips: state.trips.map(t => {
                    if (t.id === tripId) {
                        return {
                            ...t,
                            clients: t.clients.filter(c => c.userId._id !== clientId)
                        };
                    }
                    return t;
                }),
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    }
}));
