import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Reclamation {
    id: string;
    reporterId: string;
    tripId?: string;
    type: 'accident' | 'behaving' | 'lost_item' | 'other';
    subject: string;
    description: string;
    evidenceUrl?: string;
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    createdAt: number;
}

interface ReclamationState {
    reclamations: Reclamation[];
    addReclamation: (reclamation: Omit<Reclamation, 'id' | 'createdAt' | 'status'>) => void;
    getReclamationsByReporter: (reporterId: string) => Reclamation[];
}

export const useReclamationStore = create<ReclamationState>()(
    persist(
        (set, get) => ({
            reclamations: [],
            addReclamation: (data) => set((state) => {
                const newReclamation: Reclamation = {
                    ...data,
                    id: Math.random().toString(36).substring(7),
                    status: 'pending',
                    createdAt: Date.now(),
                };
                return { reclamations: [...state.reclamations, newReclamation] };
            }),
            getReclamationsByReporter: (reporterId) => {
                return get().reclamations.filter(r => r.reporterId === reporterId);
            },
        }),
        {
            name: 'reclamation-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
