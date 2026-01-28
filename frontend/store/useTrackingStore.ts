import { create } from 'zustand';
import api from '../services/api';

interface LocationData {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    timestamp: number;
}

interface TrackingState {
    driverLocation: LocationData | null;
    activeDriverId: string | null;
    intervalId: any;
    subscribeToDriver: (driverId: string) => void;
    unsubscribe: () => void;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
    driverLocation: null,
    activeDriverId: null,
    intervalId: null,

    subscribeToDriver: (driverId: string) => {
        const currentDriverId = get().activeDriverId;
        if (currentDriverId === driverId) return; // Already subscribed

        // Unsubscribe from previous if any
        if (currentDriverId) {
            get().unsubscribe();
        }

        set({ activeDriverId: driverId });

        const fetchLocation = async () => {
            try {
                const response = await api.get(`/tracking/${driverId}`);
                if (response.data && response.data.location) {
                    set({ driverLocation: response.data.location });
                }
            } catch (error) {
                console.error('Error fetching driver location:', error);
            }
        };

        // Initial fetch
        fetchLocation();

        // Start polling every 5 seconds
        const interval = setInterval(fetchLocation, 5000);
        set({ intervalId: interval });
    },

    unsubscribe: () => {
        const { intervalId } = get();
        if (intervalId) {
            clearInterval(intervalId);
        }
        set({ activeDriverId: null, driverLocation: null, intervalId: null });
    },
}));
