import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import api from '../../services/api';
import { ClientTrip, LatLng, Route, RouteData, Trip } from '../../types';
import { getNextTripOccurrence } from '../../utils/timeUtils';

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
    return useQuery<Route[]>({
        queryKey: tripKeys.routes(),
        queryFn: async (): Promise<Route[]> => {
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
    return useQuery<Trip[]>({
        queryKey: tripKeys.trips(),
        queryFn: async (): Promise<Trip[]> => {
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
                    userId: m.route.userId ? {
                        _id: m.route.userId._id || m.route.userId,
                        fullName: m.route.userId.fullName,
                        email: m.route.userId.email,
                        photoURL: m.route.userId.photoURL
                    } : null,
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
    return useQuery<any[]>({
        queryKey: tripKeys.driverRequests(),
        queryFn: async (): Promise<any[]> => {
            const res = await api.get('/trip/requests/driver');
            return res.data.map((r: any) => ({
                id: r._id,
                clientId: r.clientId,
                clientRouteId: r.clientRouteId,
                tripId: r.tripId,
                status: r.status,
                initiatedBy: r.initiatedBy,
                createdAt: r.createdAt
            }));
        }
    });
};

export const useClientRequests = () => {
    return useQuery<any[]>({
        queryKey: tripKeys.clientRequests(),
        queryFn: async (): Promise<any[]> => {
            const res = await api.get('/trip/requests/client');
            return res.data.map((r: any) => ({
                id: r._id,
                clientId: r.clientId,
                clientRouteId: r.clientRouteId,
                tripId: r.tripId,
                status: r.status,
                initiatedBy: r.initiatedBy,
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
        mutationFn: async ({ clientRouteId, tripId, proposedPrice }: { clientRouteId: string, tripId: string, proposedPrice?: number }) => {
            await api.post('/trip/request-join', { clientRouteId, tripId, proposedPrice });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.clientRequests() });
            queryClient.invalidateQueries({ queryKey: tripKeys.driverRequests() }); // Also update driver requests since we just sent one
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
            queryClient.invalidateQueries({ queryKey: tripKeys.clientRequests() });
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

export const useConfirmPickup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        // @ts-ignore
        mutationFn: async ({ tripId, clientId, driverLocation }: { tripId: string, clientId: string, driverLocation?: { lat: number, lng: number } }) => {
            await api.patch('/trip/pickup', { tripId, clientId, driverLocation });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
            queryClient.invalidateQueries({ queryKey: ['auth', 'user'] }); // Update balance
        }
    });
};

export const useConfirmDropoff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        // @ts-ignore
        mutationFn: async ({ tripId, clientId, driverLocation }: { tripId: string, clientId: string, driverLocation?: { lat: number, lng: number } }) => {
            await api.patch('/trip/dropoff', { tripId, clientId, driverLocation });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useClientConfirmWaiting = () => {
    const queryClient = useQueryClient();
    return useMutation({
        // @ts-ignore
        mutationFn: async ({ tripId }: { tripId: string }) => {
            await api.patch('/trip/waiting', { tripId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useDriverArrived = () => {
    const queryClient = useQueryClient();
    return useMutation({
        // @ts-ignore
        mutationFn: async ({ tripId, clientId, driverLocation }: { tripId: string, clientId: string, driverLocation?: { lat: number, lng: number } }) => {
            await api.patch('/trip/arrived', { tripId, clientId, driverLocation });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useDriverReady = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (tripId: string) => {
            await api.post(`/trip/${tripId}/ready/driver`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useClientReady = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (tripId: string) => {
            await api.post(`/trip/${tripId}/ready/client`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useCancelTrip = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ tripId, reason }: { tripId: string, reason: string }) => {
            await api.post(`/trip/${tripId}/cancel`, { reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

// ==========================================
// PHASE 7: PICKUP & DROPOFF DISPUTES/CANCELS
// ==========================================

export const useCancelPickup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { tripId: string, clientId: string, reason: string }) => {
            const res = await api.post('/trip/cancel-pickup', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useCancelDropoff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { tripId: string, clientId: string, reason: string }) => {
            const res = await api.post('/trip/cancel-dropoff', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useClientConfirmPickup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { tripId: string, isConfirmed: boolean, rating?: number, reason?: string }) => {
            const res = await api.post('/trip/client-confirm-pickup', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useClientConfirmDropoff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { tripId: string, isConfirmed: boolean, rating?: number, reason?: string }) => {
            const res = await api.post('/trip/client-confirm-dropoff', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

export const useFinishTrip = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (tripId: string) => {
            const res = await api.post(`/trip/${tripId}/finish`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
        }
    });
};

// ==========================================
// CLIENT HOME SCREEN — Unified Trip Hooks
// ==========================================

const IN_PROGRESS_TRIP_STATUSES = ['STARTING_SOON', 'STARTED', 'IN_PROGRESS', 'ARRIVED_PICKUP', 'CLIENT_PICKED_UP', 'CLIENT_DROPPED_OFF'];
const IN_PROGRESS_CLIENT_STATUSES = ['READY', 'PICKUP_INCOMING', 'IN_CAR'];

/**
 * useClientTrips — merges Routes + Trips + JoinRequests into a unified ClientTrip[] array.
 * This is the single source of truth for the client home screen.
 */
export const useClientTrips = () => {
    const { data: routes, isLoading: routesLoading } = useRoutes();
    const { data: trips, isLoading: tripsLoading } = useTrips();
    const { data: requests, isLoading: requestsLoading } = useClientRequests();

    const clientTrips = useMemo((): ClientTrip[] => {
        const myRoutes = (routes || []).filter(r => r.role === 'client');
        if (myRoutes.length === 0) return [];

        return myRoutes.map((route): ClientTrip => {
            // Find if this route is part of any trip (via join request)
            const matchedRequest = (requests || []).find(
                (req: any) => req.clientRouteId?._id === route.id || req.clientRouteId === route.id
            );

            // Also check if this route appears in any trip's clients array
            const matchedTrip = (trips || []).find(
                (trip: any) => trip.clients?.some((c: any) =>
                    (c.routeId?.id === route.id || c.routeId === route.id)
                )
            );

            let status: ClientTrip['status'] = 'searching';
            let driver: ClientTrip['driver'] | undefined;
            let tripId: string | undefined;
            let tripStatus: string | undefined;
            let clientStatus: string | undefined;

            if (matchedTrip) {
                tripId = matchedTrip.id;
                tripStatus = matchedTrip.status;

                // Get driver info
                if (matchedTrip.driverId) {
                    const d = matchedTrip.driverId;
                    driver = {
                        id: typeof d === 'string' ? d : d._id,
                        fullName: typeof d === 'string' ? 'Driver' : d.fullName,
                        photoURL: typeof d === 'string' ? undefined : d.photoURL,
                    };
                }

                // Get client's status within the trip
                const clientEntry = matchedTrip.clients?.find(
                    (c: any) => c.routeId?.id === route.id || c.routeId === route.id
                );
                clientStatus = clientEntry?.status;

                // Determine overall status
                if (matchedTrip.status === 'COMPLETED') {
                    status = 'completed';
                } else if (matchedTrip.status === 'CANCELLED') {
                    status = 'cancelled';
                } else if (
                    IN_PROGRESS_TRIP_STATUSES.includes(matchedTrip.status) ||
                    (clientStatus && IN_PROGRESS_CLIENT_STATUSES.includes(clientStatus))
                ) {
                    status = 'active';
                } else {
                    status = 'matched';
                }
            } else if (matchedRequest) {
                // Has a request but no trip match yet
                if (matchedRequest.status === 'accepted') {
                    // Request accepted, trip should exist — check tripId
                    const reqTrip = matchedRequest.tripId;
                    if (reqTrip) {
                        tripId = typeof reqTrip === 'string' ? reqTrip : reqTrip._id || reqTrip.id;
                        const driverData = reqTrip.driverId;
                        if (driverData && typeof driverData !== 'string') {
                            driver = {
                                id: driverData._id,
                                fullName: driverData.fullName,
                                photoURL: driverData.photoURL,
                            };
                        }
                        tripStatus = reqTrip.status;
                        status = 'matched';

                        // Check if the trip is active
                        if (reqTrip.status && IN_PROGRESS_TRIP_STATUSES.includes(reqTrip.status)) {
                            status = 'active';
                        }
                    } else {
                        status = 'matched';
                    }
                } else if (matchedRequest.status === 'pending') {
                    status = 'searching';
                } else {
                    status = 'searching'; // rejected — still searching
                }
            }

            // Calculate next occurrence for non-active trips
            const nextOccurrence = (status !== 'active' && status !== 'completed' && status !== 'cancelled')
                ? getNextTripOccurrence(route.timeStart, route.days)
                : null;

            return {
                id: route.id,
                routeId: route.id,
                startPoint: route.startPoint,
                endPoint: route.endPoint,
                waypoints: route.waypoints || [],
                days: route.days,
                timeStart: route.timeStart,
                price: route.price,
                status,
                driver,
                tripId,
                tripStatus,
                clientStatus,
                nextOccurrence,
                createdAt: (route as any).createdAt,
                routeGeometry: route.routeGeometry,
                distanceKm: route.distanceKm,
                estimatedDurationMin: route.estimatedDurationMin,
            };
        }).filter(t => t.status !== 'completed' && t.status !== 'cancelled'); // Only show active/searching/matched
    }, [routes, trips, requests]);

    return {
        data: clientTrips,
        isLoading: routesLoading || tripsLoading || requestsLoading,
    };
};

/**
 * useCreateClientTrip — calls the convenience endpoint that creates a Route
 * internally but returns trip-shaped data.
 */
export const useCreateClientTrip = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            startPoint: LatLng;
            endPoint: LatLng;
            waypoints?: LatLng[];
            days: string[];
            timeStart: string;
            price: number;
        }) => {
            const res = await api.post('/trip/client-trip', data);
            return res.data as ClientTrip;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.routes() });
            queryClient.invalidateQueries({ queryKey: tripKeys.trips() });
            queryClient.invalidateQueries({ queryKey: tripKeys.clientRequests() });
        }
    });
};
