import { create } from 'zustand';
import driverService, { AnalyticsData } from '../services/driverService';

interface AnalyticsState {
    stats: AnalyticsData | null;
    isLoading: boolean;
    error: string | null;
    fetchStats: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
    stats: null,
    isLoading: false,
    error: null,
    fetchStats: async () => {
        set({ isLoading: true, error: null });
        try {
            const stats = await driverService.getStats();
            set({ stats });
        } catch (error: any) {
            set({ error: error.response?.data?.msg || error.message });
        } finally {
            set({ isLoading: false });
        }
    }
}));
