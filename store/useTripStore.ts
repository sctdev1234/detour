import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface LatLng {
    latitude: number;
    longitude: number;
}

export interface Trip {
    id: string;
    driverId: string;
    carId: string;
    startPoint: LatLng;
    endPoint: LatLng;
    waypoints: LatLng[];
    timeStart: string; // e.g., "08:00"
    timeArrival: string; // e.g., "09:00"
    days: string[]; // e.g., ["Monday", "Tuesday"]
    price: number;
    priceType: 'fix' | 'km';
    status: 'active' | 'inactive';
    distanceKm?: number;
    estimatedDurationMin?: number;
    routeGeometry?: string;
    passengers?: string[]; // Array of client IDs
}

interface TripState {
    trips: Trip[];
    addTrip: (trip: Omit<Trip, 'id' | 'driverId'>) => void;
    removeTrip: (id: string) => void;
    updateTrip: (id: string, updates: Partial<Trip>) => void;
    addPassenger: (tripId: string, clientId: string) => void;
    removePassenger: (tripId: string, clientId: string) => void;
}

export const useTripStore = create<TripState>()(
    persist(
        (set) => ({
            trips: [],
            addTrip: (tripData) => set((state) => {
                const id = Math.random().toString(36).substring(7);
                const newTrip = {
                    ...tripData,
                    id,
                    driverId: 'me',
                    distanceKm: tripData.distanceKm || 0,
                    estimatedDurationMin: tripData.estimatedDurationMin || 0,
                    routeGeometry: tripData.routeGeometry || '',
                    passengers: []
                }; // Placeholder driverId
                return { trips: [...state.trips, newTrip] };
            }),
            removeTrip: (id) => set((state) => ({
                trips: state.trips.filter((t) => t.id !== id),
            })),
            updateTrip: (id, updates) => set((state) => ({
                trips: state.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
            })),
            addPassenger: (tripId, clientId) => set((state) => ({
                trips: state.trips.map((t) =>
                    t.id === tripId
                        ? { ...t, passengers: [...(t.passengers || []), clientId] }
                        : t
                ),
            })),
            removePassenger: (tripId, clientId) => set((state) => ({
                trips: state.trips.map((t) =>
                    t.id === tripId
                        ? { ...t, passengers: (t.passengers || []).filter(p => p !== clientId) }
                        : t
                ),
            })),
        }),
        {
            name: 'trip-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
