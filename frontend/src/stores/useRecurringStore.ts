import { create } from 'zustand';
import { recurringApi, TripTemplate, VacationMode } from '../services/recurringApi';

interface RecurringState {
    templates: TripTemplate[];
    selectedTemplate: TripTemplate | null;
    isLoading: boolean;
    error: string | null;
    
    fetchTemplates: () => Promise<void>;
    selectTemplate: (id: string) => Promise<void>;
    createPassengerTemplate: (data: any) => Promise<void>;
    createDriverTemplate: (data: any) => Promise<void>;
    updateVacation: (id: string, mode: VacationMode) => Promise<void>;
    archiveTemplate: (id: string) => Promise<void>;
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
    templates: [],
    selectedTemplate: null,
    isLoading: false,
    error: null,

    fetchTemplates: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await recurringApi.getMyTemplates();
            if (res.success) {
                set({ templates: res.data });
            } else {
                set({ error: res.error });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    selectTemplate: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await recurringApi.getTemplateDetails(id);
            if (res.success) {
                set({ selectedTemplate: res.data });
            } else {
                set({ error: res.error });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    createPassengerTemplate: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
            const res = await recurringApi.createPassengerRecurring(data);
            if (res.success) {
                await get().fetchTemplates();
            } else {
                set({ error: res.error });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    createDriverTemplate: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
            const res = await recurringApi.createDriverRecurring(data);
            if (res.success) {
                await get().fetchTemplates();
            } else {
                set({ error: res.error });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    updateVacation: async (id: string, mode: VacationMode) => {
        set({ isLoading: true, error: null });
        try {
            const res = await recurringApi.updateVacationMode(id, mode);
            if (res.success) {
                await get().fetchTemplates();
                if (get().selectedTemplate?._id === id) {
                    await get().selectTemplate(id);
                }
            } else {
                set({ error: res.error });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    archiveTemplate: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await recurringApi.archiveTemplate(id);
            if (res.success) {
                await get().fetchTemplates();
                if (get().selectedTemplate?._id === id) {
                    set({ selectedTemplate: null });
                }
            } else {
                set({ error: res.error });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    }
}));
