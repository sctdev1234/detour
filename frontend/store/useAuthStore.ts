import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Role, User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    role: Role;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'unverified';
    documents: {
        cinFront?: string;
        cinBack?: string;
        license?: string;
        carRegistration?: string;
        facePhoto?: string;
    };
    isLoading: boolean;

    // Actions (Synchronous setters only)
    setSession: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    setRole: (role: Role) => void;
    setVerificationStatus: (status: 'pending' | 'verified' | 'rejected' | 'unverified') => void;
    updateDocuments: (docs: Partial<AuthState['documents']>) => void;
    setLoading: (loading: boolean) => void;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            role: null,
            verificationStatus: 'unverified',
            documents: {},
            isLoading: true, // Initial load state

            setSession: (user, token) => set({
                user,
                token,
                role: user.role as Role,
                verificationStatus: user.verificationStatus,
                isLoading: false
            }),

            logout: () => set({
                user: null,
                token: null,
                role: null,
                isLoading: false,
                verificationStatus: 'unverified',
                documents: {}
            }),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),

            setVerificationStatus: (status) => set({ verificationStatus: status }),
            setRole: (role) => set({ role: role as Role }),
            updateDocuments: (docs) => set((state) => ({ documents: { ...state.documents, ...docs } })),
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
                            role: user.role as Role,
                            verificationStatus: user.verificationStatus,
                            isLoading: false
                        });
                    } else {
                        set({
                            user: null,
                            token: null,
                            role: null,
                            verificationStatus: 'unverified',
                            isLoading: false
                        });
                    }
                } catch (error) {
                    console.error('checkAuth failed:', error);
                    set({
                        user: null,
                        token: null,
                        role: null,
                        verificationStatus: 'unverified',
                        isLoading: false
                    });
                }
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ token: state.token, user: state.user, role: state.role }),
        }
    )
);
