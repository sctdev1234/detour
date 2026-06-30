export type Role = 'driver' | 'client' | 'admin' | null;

export interface User {
    id: string; // id is alias for _id usually
    _id?: string;
    email: string;
    fullName: string;
    role: Role;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'unverified';
    photoURL?: string;
    documents?: any;
    savedPlaces?: SavedPlace[];
    onboardingStatus?: {
        completed: boolean;
        steps: OnboardingStep[];
    };
    // Financials
    balance?: number;
    earnings?: {
        today: number;
        total: number;
    };
    spending?: {
        today: number;
        total: number;
    };
    stats?: {
        tripsDone: number;
        clientsServed?: number;
        hoursOnline?: number;
        rating?: number;
    };
    subscription?: {
        status: 'free' | 'pro';
        expiresAt?: Date;
    };
}

export interface SavedPlace {
    _id: string;
    label: string;
    address: string;
    latitude: number;
    longitude: number;
    icon: string;
}

export interface OnboardingStep {
    id: string;
    label: string;
    status: 'pending' | 'in-progress' | 'completed';
    required: boolean;
}

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
    userId: string | User; // Can be populated
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
            email?: string;
            photoURL?: string;
        };
        routeId: Route;
        price?: number;
        seats?: number;
        status?: 'WAITING' | 'READY' | 'PICKUP_INCOMING' | 'IN_CAR' | 'DROPPED_OFF' | 'COMPLETED' | 'CANCELLED';
        paymentStatus?: 'pending' | 'paid' | 'failed';
    }>;
    status: 'CREATED' | 'PENDING' | 'FULL' | 'CONFIRMED' | 'STARTING_SOON' | 'STARTED' | 'IN_PROGRESS' | 'ARRIVED_PICKUP' | 'CLIENT_PICKED_UP' | 'CLIENT_DROPPED_OFF' | 'COMPLETED' | 'CANCELLED' | 'active';
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

/**
 * ClientTrip — the unified type the client home screen uses.
 * Merges Route data (schedule, locations) with Trip data (matching status, driver info).
 * Under the hood, a Route still exists in the backend for geospatial matching.
 */
export type ClientTrip = {
    id: string;           // Route._id (used as the trip identifier for clients)
    routeId: string;      // Same as id — internal Route._id
    startPoint: LatLng;
    endPoint: LatLng;
    waypoints: LatLng[];
    days: string[];
    timeStart: string;
    price: number;
    status: 'searching' | 'matched' | 'active' | 'completed' | 'cancelled';
    // Present when matched with a driver (from Trip/JoinRequest):
    driver?: {
        id: string;
        fullName: string;
        photoURL?: string;
    };
    tripId?: string;      // Actual Trip._id once matched
    tripStatus?: string;  // Trip-level status (CREATED, STARTED, IN_PROGRESS, etc.)
    clientStatus?: string; // Client's status within the trip (WAITING, READY, IN_CAR, etc.)
    nextOccurrence?: Date | null;
    createdAt?: string;
};
