export type Role = 'driver' | 'client' | 'admin' | null;

export interface User {
    id: string; // id is alias for _id usually
    _id?: string;
    email: string;
    fullName: string;
    role: Role;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'unverified';
    photoURL?: string;
    documents?: any[];
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
        status?: 'ROUTE_CREATED' | 'WAITING_AT_PICKUP' | 'PICKED_UP' | 'DROPPED_OFF' | 'CANCELLED' | 'pending';
        paymentStatus?: 'pending' | 'paid' | 'failed';
    }>;
    status: 'CREATED' | 'PENDING' | 'MATCHING' | 'PARTIAL' | 'FULL' | 'CONFIRMED' | 'STARTING' | 'STARTED' | 'PICKUP_IN_PROGRESS' | 'IN_PROGRESS' | 'DROPOFF_IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'active' | 'pending';
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
