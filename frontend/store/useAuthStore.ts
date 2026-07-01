import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

import { Role, User } from '../types';
import NetInfo from '@react-native-community/netinfo';

interface RetryAction {
    id: string;
    action: string;
    payload: any;
    timestamp: number;
}

const secureStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (Platform.OS === 'web') return localStorage.getItem(name);
        return (await SecureStore.getItemAsync(name)) || null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') return localStorage.setItem(name, value);
        await SecureStore.setItemAsync(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        if (Platform.OS === 'web') return localStorage.removeItem(name);
        await SecureStore.deleteItemAsync(name);
    },
};

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    isOffline: boolean;
    retryQueue: RetryAction[];

    // Actions (Synchronous setters only)
    setSession: (user: User, token: string, refreshToken?: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    setLoading: (loading: boolean) => void;
    setOffline: (isOffline: boolean) => void;
    addToRetryQueue: (action: Omit<RetryAction, 'id' | 'timestamp'>) => void;
    clearRetryQueue: () => void;
    handleSessionConflict: () => void;
    checkAuth: () => Promise<void>;
}

// Start network listener
NetInfo.addEventListener(state => {
    useAuthStore.getState().setOffline(!state.isConnected);
});

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: null,
            isLoading: true, // Initial load state
            isOffline: false,
            retryQueue: [],

            setSession: (user, token, refreshToken) => set({
                user,
                token,
                refreshToken: refreshToken || null,
                isLoading: false
            }),

            logout: () => set({
                user: null,
                token: null,
                refreshToken: null,
                isLoading: false
            }),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),

            setLoading: (isLoading) => set({ isLoading }),

            setOffline: (isOffline) => set({ isOffline }),

            addToRetryQueue: (action) => set((state) => ({
                retryQueue: [...state.retryQueue, {
                    ...action,
                    id: Math.random().toString(36).substring(7),
                    timestamp: Date.now()
                }]
            })),

            clearRetryQueue: () => set({ retryQueue: [] }),

            handleSessionConflict: () => {
                // If the backend detects another login with the same user, we log them out and notify them
                set({
                    user: null,
                    token: null,
                    refreshToken: null,
                    isLoading: false
                });
                const { useUIStore } = require('./useUIStore');
                useUIStore.getState().showToast('Session expired. You were logged in on another device.', 'error');
                
                const { router } = require('expo-router');
                router.replace('/(auth)/login');
            },

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
                            refreshToken: null,
                            isLoading: false
                        });
                    }
                } catch (error) {
                    console.error('checkAuth failed:', error);
                    set({
                        user: null,
                        token: null,
                        refreshToken: null,
                        isLoading: false
                    });
                }
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => secureStorage),
            partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken }), // Persist tokens. Fetch user on boot.
        }
    )
);
