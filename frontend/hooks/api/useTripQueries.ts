import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { LatLng, Route, RouteData, Trip } from '../../types';

// Query Keys
export const tripKeys = {
    all: ['trips'] as const,
    routes: () => [...tripKeys.all, 'routes'] as const,
    trips: () => [...tripKeys.all, 'list'] as const,
    matches: (routeId: string) => [...tripKeys.all, 'matches', routeId] as const,
    driverRequests: () => [...tripKeys.all, 'requests', 'driver'] as const,
    clientRequests: () => [...tripKeys.all, 'requests', 'client'] as const,
};

// --- Queries ---

export const useRoutes = () => {
    return useQuery({
        queryKey: tripKeys.routes(),
        queryFn: async () => {
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
            return formattedRoutes;
        }
    });
};

export const useTrips = () => {
    return useQuery({
        queryKey: tripKeys.trips(),
        queryFn: async () => {
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
                        id: c.routeId?._id,
                        userId: c.routeId?.userId,
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
                        price: c.price,
                        seats: c.seats
                    }
                }))
            }));
            return formattedTrips;
        }
    });
};

export const useMatches = (routeId: string | null) => {
    return useQuery({
        queryKey: tripKeys.matches(routeId || ''),
        queryFn: async () => {
            const res = await api.get(`/trip/matches/${routeId}`);
            return res.data.map((m: any) => ({
                route: {
                    id: m.route._id,
                    userId: m.route.userId?._id || m.route.userId,
                    fullName: m.route.userId?.fullName, // Added for convenience
                    photoURL: m.route.userId?.photoURL, // Added for convenience
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
                    days: m.route.schedule?.days || [],
                    timeStart: m.route.schedule?.time || '',
                    price: m.route.price?.amount || 0,
                    priceType: m.route.price?.type || 'fix',
                    routeGeometry: m.route.routeGeometry,
                    distanceKm: m.route.distanceKm
                },
                trip: m.trip ? { id: m.trip._id, status: m.trip.status } : null
            }));
        },
        enabled: !!routeId
    });
};

export const useDriverRequests = () => {
    return useQuery({
        queryKey: tripKeys.driverRequests(),
        queryFn: async () => {
            const res = await api.get('/trip/requests/driver');
            return res.data.map((r: any) => ({
                id: r._id,
                clientId: r.clientId,
                clientRouteId: r.clientRouteId,
                tripId: r.tripId,
                status: r.status,
                createdAt: r.createdAt
            }));
        }
    });
};

export const useClientRequests = () => {
    return useQuery({
        queryKey: tripKeys.clientRequests(),
        queryFn: async () => {
            const res = await api.get('/trip/requests/client');
            return res.data.map((r: any) => ({
                id: r._id,
                clientId: r.clientId,
                clientRouteId: r.clientRouteId,
                tripId: r.tripId,
                status: r.status,
                createdAt: r.createdAt
            }));
        }
    });
};

// --- Mutations ---

export const useAddRoute = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: RouteData) => {
            const res = await api.post('/trip/route', data);
            const newRoute: Route = {
                ...data,
                id: res.data._id,
                userId: res.data.userId
            };
            return newRoute;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.routes() });
        }
    });
};

export const useRemoveRoute = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (routeId: string) => {
            await api.delete(`/trip/route/${routeId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.routes() });
        }
    });
};

export const useSearchTrips = () => {
    return useMutation({
        mutationFn: async ({ pickup, destination }: { pickup: LatLng, destination: LatLng }) => {
            // 1. Create temporary Client Route
            const routeData = {
                role: 'client',
                startPoint: pickup,
                endPoint: destination,
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                timeStart: '08:00',
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

            // 3. Format
            return resMatches.data.map((m: any) => ({
                id: m.trip?._id || 'no-trip-id',
                driverName: m.route.userId?.fullName || 'Unknown Driver',
                profilePhoto: m.route.userId?.photoURL,
                carId: m.route.carId,
                price: m.route.price?.amount || 0,
                priceType: m.route.price?.type || 'fix',
                timeStart: m.route.schedule?.time || '',
                startPoint: m.route.startPoint,
                endPoint: m.route.endPoint,
                routeId: m.route._id,
                distanceKm: m.route.distanceKm,
                clientRouteId: clientRouteId // pass this back so we know which route to request with
            }));
        }
    });
};

export const useSendJoinRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ clientRouteId, tripId }: { clientRouteId: string, tripId: string }) => {
            await api.post('/trip/request-join', { clientRouteId, tripId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.clientRequests() });
        }
    });
};

export const useHandleJoinRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ requestId, status }: { requestId: string, status: 'accepted' | 'rejected' }) => {
            await api.post('/trip/handle-request', { requestId, status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.driverRequests() });
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() }); // Trip client list might update
        }
    });
};

export const useStartTrip = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (tripId: string) => {
            await api.patch(`/trip/${tripId}/start`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useCompleteTrip = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (tripId: string) => {
            await api.patch(`/trip/${tripId}/complete`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useRemoveClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ tripId, clientId }: { tripId: string, clientId: string }) => {
            await api.delete(`/trip/${tripId}/client/${clientId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};
