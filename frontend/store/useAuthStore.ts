import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Role, User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;

    // Actions (Synchronous setters only)
    setSession: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    setLoading: (loading: boolean) => void;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isLoading: true, // Initial load state

            setSession: (user, token) => set({
                user,
                token,
                isLoading: false
            }),

            logout: () => set({
                user: null,
                token: null,
                isLoading: false
            }),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),

            setLoading: (isLoading) => set({ isLoading }),

            // Async Actions
            checkAuth: async () => {
                set({ isLoading: true });
                try {
                    const { authService } = require('../services/auth'); // Lazy import to avoid cycle if any
                    const user = await authService.getCurrentUser();
                    if (user) {
                        set({
                            user,
                            isLoading: false
                        });
                    } else {
                        set({
                            user: null,
                            token: null,
                            isLoading: false
                        });
                    }
                } catch (error) {
                    console.error('checkAuth failed:', error);
                    set({
                        user: null,
                        token: null,
                        isLoading: false
                    });
                }
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ token: state.token }), // Only persist token. Fetch user on boot.
        }
    )
);
