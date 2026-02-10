import { create } from 'zustand';
import { API_URL } from '../services/apiConfig';
import { useAuthStore } from './useAuthStore';

export interface SavedPlace {
    _id: string;
    label: string;
    address: string;
    latitude: number;
    longitude: number;
    icon: string;
}

interface PlacesState {
    places: SavedPlace[];
    isLoading: boolean;
    fetchPlaces: () => Promise<void>;
    addPlace: (place: Omit<SavedPlace, '_id'>) => Promise<void>;
    removePlace: (id: string) => Promise<void>;
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
    places: [],
    isLoading: false,

    fetchPlaces: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        set({ isLoading: true });
        try {
            const res = await fetch(`${API_URL}/places`, {
                headers: {
                    'x-auth-token': token,
                    'Bypass-Tunnel-Reminder': 'true'
                }
            });

            if (res.ok) {
                const places = await res.json();
                set({ places, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to fetch places:', error);
            set({ isLoading: false });
        }
    },

    addPlace: async (place) => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error('Not authenticated');

        set({ isLoading: true });
        try {
            const res = await fetch(`${API_URL}/places`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                    'Bypass-Tunnel-Reminder': 'true'
                },
                body: JSON.stringify(place)
            });

            if (!res.ok) throw new Error('Failed to add place');

            const newPlace = await res.json();
            set(state => ({
                places: [newPlace, ...state.places],
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    removePlace: async (id) => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error('Not authenticated');

        set({ isLoading: true });
        try {
            const res = await fetch(`${API_URL}/places/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token,
                    'Bypass-Tunnel-Reminder': 'true'
                }
            });

            if (!res.ok) throw new Error('Failed to remove place');

            set(state => ({
                places: state.places.filter(p => p._id !== id),
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    }
}));
