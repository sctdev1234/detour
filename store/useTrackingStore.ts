import { off, onValue, ref } from 'firebase/database';
import { create } from 'zustand';
import { database } from '../services/firebaseConfig';

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
    subscribeToDriver: (driverId: string) => void;
    unsubscribe: () => void;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
    driverLocation: null,
    activeDriverId: null,

    subscribeToDriver: (driverId: string) => {
        const currentDriverId = get().activeDriverId;
        if (currentDriverId === driverId) return; // Already subscribed

        // Unsubscribe from previous if any
        if (currentDriverId) {
            get().unsubscribe();
        }

        const locationRef = ref(database, `drivers/${driverId}/location`);

        onValue(locationRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                set({ driverLocation: data });
            }
        });

        set({ activeDriverId: driverId });
    },

    unsubscribe: () => {
        const { activeDriverId } = get();
        if (activeDriverId) {
            const locationRef = ref(database, `drivers/${activeDriverId}/location`);
            off(locationRef);
            set({ activeDriverId: null, driverLocation: null });
        }
    },
}));
