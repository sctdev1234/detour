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
    forgotPassword: (email: string) => Promise<string>; // Returns token for dev simulation
    resetPassword: (token: string, newPassword: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    setVerificationStatus: (status: 'pending' | 'verified' | 'rejected' | 'unverified') => void;
    updateDocuments: (docs: Partial<AuthState['documents']>) => void;
    updateProfile: (data: Partial<User>) => Promise<void>;
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
                            errorMsg = text || errorMsg;
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
                            errorMsg = text || errorMsg;
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

            forgotPassword: async (email) => {
                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_URL}/auth/forgot-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });

                    if (!res.ok) {
                        const text = await res.text();
                        let errorMsg = 'Failed to request password reset';
                        try {
                            const error = JSON.parse(text);
                            errorMsg = error.msg || errorMsg;
                        } catch (e) { errorMsg = text || errorMsg; }
                        throw new Error(errorMsg);
                    }

                    const data = await res.json();
                    set({ isLoading: false });
                    return data.token; // Return token for dev flow
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            resetPassword: async (token, newPassword) => {
                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_URL}/auth/reset-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token, newPassword })
                    });
                    if (!res.ok) {
                        const text = await res.text();
                        let errorMsg = 'Failed to reset password';
                        try {
                            const error = JSON.parse(text);
                            errorMsg = error.msg || errorMsg;
                        } catch (e) { errorMsg = text || errorMsg; }
                        throw new Error(errorMsg);
                    }
                    set({ isLoading: false });
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
                        set({
                            user: { ...user, id: user._id },
                            role: user.role,
                            verificationStatus: user.verificationStatus,
                            isLoading: false
                        });
                    } else {
                        console.log('Token invalid, logging out');
                        get().logout();
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                    // Force logout on error to clear stale state during dev
                    get().logout();
                    set({ isLoading: false });
                }
            },

            setVerificationStatus: (status) => set({ verificationStatus: status }),
            updateDocuments: (docs) => set((state) => ({ documents: { ...state.documents, ...docs } })),

            updateProfile: async (data) => {
                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_URL}/auth/update`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': get().token || ''
                        },
                        body: JSON.stringify(data)
                    });

                    if (!res.ok) throw new Error('Failed to update profile');

                    const updatedUser = await res.json();

                    // Merge with existing user to keep fields like role/id if not returned
                    set((state) => ({
                        user: { ...state.user!, ...updatedUser },
                        isLoading: false
                    }));
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            // Legacy setters
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
