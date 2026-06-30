import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes (data remains fresh for 5 mins)
            gcTime: 1000 * 60 * 30, // 30 minutes (cache garbage collection)
            retry: 2, // Retry failed requests twice
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: 1,
        },
    },
});

// Standardized Query Keys Factory
export const queryKeys = {
    auth: {
        session: ['auth', 'session'] as const,
        profile: (userId: string) => ['auth', 'profile', userId] as const,
    },
    cars: {
        all: ['cars'] as const,
        byOwner: (ownerId: string) => ['cars', 'owner', ownerId] as const,
        detail: (carId: string) => ['cars', 'detail', carId] as const,
    },
    places: {
        all: ['places'] as const,
        byUser: (userId: string) => ['places', 'user', userId] as const,
    },
    trips: {
        all: ['trips'] as const,
        detail: (tripId: string) => ['trips', 'detail', tripId] as const,
        active: ['trips', 'active'] as const,
    },
    routes: {
        all: ['routes'] as const,
        detail: (routeId: string) => ['routes', 'detail', routeId] as const,
        matches: (routeId: string) => ['routes', 'matches', routeId] as const,
    },
    notifications: {
        all: ['notifications'] as const,
        unreadCount: ['notifications', 'unreadCount'] as const,
    }
};
