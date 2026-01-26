import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { API_URL } from '../services/apiConfig';

export type Role = 'driver' | 'client' | null;

interface User {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'unverified';
}

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
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    setVerificationStatus: (status: 'pending' | 'verified' | 'rejected' | 'unverified') => void;
    updateDocuments: (docs: Partial<AuthState['documents']>) => void;
    setUser: (user: User | null) => void;
    setRole: (role: Role) => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            role: null,
            verificationStatus: 'unverified',
            documents: {},
            isLoading: true,

            login: async (email, password) => {
                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    if (!res.ok) {
                        const error = await res.json();
                        throw new Error(error.msg || 'Login failed');
                    }

                    const data = await res.json();
                    set({
                        user: data.user,
                        token: data.token,
                        role: data.user.role as Role,
                        verificationStatus: data.user.verificationStatus,
                        isLoading: false
                    });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            register: async (email, password, fullName, role) => {
                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_URL}/auth/signup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, fullName, role })
                    });

                    if (!res.ok) {
                        const error = await res.json();
                        throw new Error(error.msg || 'Registration failed');
                    }

                    const data = await res.json();
                    set({
                        user: data.user,
                        token: data.token,
                        role: data.user.role as Role,
                        verificationStatus: data.user.verificationStatus,
                        isLoading: false
                    });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            logout: () => set({
                user: null,
                token: null,
                role: null,
                isLoading: false,
                verificationStatus: 'unverified',
                documents: {}
            }),

            checkAuth: async () => {
                // In a real app, you might validate the token with the backend here
                // For now, we trust the persisted state or simple presence of token
                const token = get().token;
                if (token) {
                    set({ isLoading: false });
                } else {
                    set({ isLoading: false });
                }
            },

            setVerificationStatus: (status) => set({ verificationStatus: status }),
            updateDocuments: (docs) => set((state) => ({ documents: { ...state.documents, ...docs } })),

            // Legacy setters (kept for compatibility during refactor)
            setUser: (user) => set({ user }),
            setRole: (role) => set({ role }),
            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ token: state.token, user: state.user, role: state.role }),
        }
    )
);
