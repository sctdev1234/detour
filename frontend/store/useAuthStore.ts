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
                        headers: {
                            'Content-Type': 'application/json',
                            'Bypass-Tunnel-Reminder': 'true'
                        },
                        body: JSON.stringify({ email, password })
                    });

                    if (!res.ok) {
                        const text = await res.text();
                        let errorMsg = 'Login failed';
                        try {
                            const error = JSON.parse(text);
                            errorMsg = error.msg || error.message || errorMsg;
                        } catch (e) {
                            errorMsg = text || errorMsg; // Fallback to raw text if not JSON
                        }
                        throw new Error(errorMsg);
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
                        headers: {
                            'Content-Type': 'application/json',
                            'Bypass-Tunnel-Reminder': 'true'
                        },
                        body: JSON.stringify({ email, password, fullName, role })
                    });

                    if (!res.ok) {
                        const text = await res.text();
                        let errorMsg = 'Registration failed';
                        try {
                            const error = JSON.parse(text);
                            errorMsg = error.msg || error.message || errorMsg;
                        } catch (e) {
                            errorMsg = text || errorMsg; // Fallback to raw text if not JSON
                        }
                        throw new Error(errorMsg);
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
                const token = get().token;
                if (!token) {
                    set({ isLoading: false });
                    return;
                }

                try {
                    const res = await fetch(`${API_URL}/auth/me`, {
                        method: 'GET',
                        headers: {
                            'x-auth-token': token,
                            'Bypass-Tunnel-Reminder': 'true'
                        }
                    });

                    if (res.ok) {
                        const user = await res.json();
                        // Update user data from server
                        set({
                            user: { ...user, id: user._id }, // Ensure ID mapping if needed
                            role: user.role, // Ensure role matches server
                            verificationStatus: user.verificationStatus,
                            isLoading: false
                        });
                    } else {
                        // Token invalid/expired
                        console.log('Token invalid, logging out');
                        get().logout();
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                    // If network error, maybe keep user logged in but warn? 
                    // For now, fail safe and just stop loading.
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
