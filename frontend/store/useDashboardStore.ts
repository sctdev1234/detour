import { create } from 'zustand';

export type DriverStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'BREAK';
export type BottomSheetState = 'collapsed' | 'expanded' | 'hidden';

interface DashboardState {
    // Driver Status
    driverStatus: DriverStatus;
    isUpdatingStatus: boolean;
    setDriverStatus: (status: DriverStatus) => void;
    toggleDriverStatus: () => Promise<void>;

    // Bottom Sheet
    bottomSheetState: BottomSheetState;
    setBottomSheetState: (state: BottomSheetState) => void;

    // Map Layers
    showSavedPlaces: boolean;
    showSavedRoutes: boolean;
    showNearbyRequests: boolean;
    toggleLayer: (layer: 'savedPlaces' | 'savedRoutes' | 'nearbyRequests') => void;

    // Active Trip Focus
    isActiveTripMode: boolean;
    setActiveTripMode: (active: boolean) => void;

    // Selected Route on Map
    selectedMapRouteId: string | null;
    setSelectedMapRouteId: (id: string | null) => void;
}

import driverService from '../services/driverService';

export const useDashboardStore = create<DashboardState>((set, get) => ({
    // Driver Status
    driverStatus: 'OFFLINE',
    isUpdatingStatus: false,
    setDriverStatus: (status) => set({ driverStatus: status }),
    toggleDriverStatus: async () => {
        const state = get();
        if (state.isUpdatingStatus) return;
        set({ isUpdatingStatus: true });
        try {
            const nextStatus = state.driverStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
            const status = await driverService.updateStatus(nextStatus);
            set({ driverStatus: status as DriverStatus });
        } catch (error) {
            console.error('Failed to update driver status', error);
        } finally {
            set({ isUpdatingStatus: false });
        }
    },

    // Bottom Sheet
    bottomSheetState: 'collapsed',
    setBottomSheetState: (bottomSheetState) => set({ bottomSheetState }),

    // Map Layers
    showSavedPlaces: true,
    showSavedRoutes: true,
    showNearbyRequests: false,
    toggleLayer: (layer) => set((state) => {
        const key = layer === 'savedPlaces' ? 'showSavedPlaces'
            : layer === 'savedRoutes' ? 'showSavedRoutes'
                : 'showNearbyRequests';
        return { [key]: !state[key] };
    }),

    // Active Trip
    isActiveTripMode: false,
    setActiveTripMode: (active) => set({ isActiveTripMode: active }),

    // Selected Route
    selectedMapRouteId: null,
    setSelectedMapRouteId: (id) => set({ selectedMapRouteId: id }),
}));
