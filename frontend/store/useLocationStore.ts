import * as Location from 'expo-location';
import { create } from 'zustand';

interface LocationState {
    location: Location.LocationObject | null;
    errorMsg: string | null;
    isTracking: boolean;
    setLocation: (location: Location.LocationObject | null) => void;
    setErrorMsg: (msg: string | null) => void;
    setTracking: (tracking: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
    location: null,
    errorMsg: null,
    isTracking: false,
    setLocation: (location) => set({ location }),
    setErrorMsg: (errorMsg) => set({ errorMsg }),
    setTracking: (isTracking) => set({ isTracking }),
}));
