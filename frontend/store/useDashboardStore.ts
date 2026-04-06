import { create } from 'zustand';

export type DriverStatus = 'online' | 'offline';
export type BottomSheetState = 'collapsed' | 'expanded' | 'hidden';

interface DashboardState {
    // Driver Status
    driverStatus: DriverStatus;
    setDriverStatus: (status: DriverStatus) => void;
    toggleDriverStatus: () => void;

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

export const useDashboardStore = create<DashboardState>((set) => ({
    // Driver Status
    driverStatus: 'offline',
    setDriverStatus: (status) => set({ driverStatus: status }),
    toggleDriverStatus: () => set((state) => ({
        driverStatus: state.driverStatus === 'online' ? 'offline' : 'online'
    })),

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
