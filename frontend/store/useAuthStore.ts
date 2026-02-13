import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../services/api';

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
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
    forgotPassword: (email: string) => Promise<string>; // Returns token for dev simulation
    resetPassword: (token: string, newPassword: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    submitVerification: (docs: AuthState['documents']) => Promise<void>;
    setVerificationStatus: (status: 'pending' | 'verified' | 'rejected' | 'unverified') => void;
    updateDocuments: (docs: Partial<AuthState['documents']>) => void;
    updateProfile: (data: Partial<User>) => Promise<void>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
    setUser: (user: User | null) => void;
    setRole: (role: Role) => void;
    setLoading: (loading: boolean) => void;
    addSavedPlace: (place: { label: string; address: string; latitude: number; longitude: number; icon: string }) => Promise<void>;
    removeSavedPlace: (placeId: string) => Promise<void>;
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
                    const res = await api.post('/auth/login', { email, password });
                    const data = res.data;

                    set({
                        user: data.user,
                        token: data.token,
                        role: data.user.role as Role,
                        verificationStatus: data.user.verificationStatus,
                        isLoading: false
                    });
                } catch (error: any) {
                    set({ isLoading: false });
                    const errorMsg = error.response?.data?.msg || error.response?.data?.message || 'Login failed';
                    throw new Error(errorMsg);
                }
            },

            register: async (email, password, fullName, role) => {
                set({ isLoading: true });
                try {
                    const res = await api.post('/auth/signup', { email, password, fullName, role });
                    const data = res.data;

                    set({
                        user: data.user,
                        token: data.token,
                        role: data.user.role as Role,
                        verificationStatus: data.user.verificationStatus,
                        isLoading: false
                    });
                } catch (error: any) {
                    set({ isLoading: false });
                    const errorMsg = error.response?.data?.msg || error.response?.data?.message || 'Registration failed';
                    throw new Error(errorMsg);
                }
            },

            forgotPassword: async (email) => {
                set({ isLoading: true });
                try {
                    const res = await api.post('/auth/forgot-password', { email });
                    const data = res.data;
                    set({ isLoading: false });
                    return data.token; // Return token for dev flow
                } catch (error: any) {
                    set({ isLoading: false });
                    const errorMsg = error.response?.data?.msg || error.response?.data?.message || 'Failed to request password reset';
                    throw new Error(errorMsg);
                }
            },

            resetPassword: async (token, newPassword) => {
                set({ isLoading: true });
                try {
                    await api.post('/auth/reset-password', { token, newPassword });
                    set({ isLoading: false });
                } catch (error: any) {
                    set({ isLoading: false });
                    const errorMsg = error.response?.data?.msg || error.response?.data?.message || 'Failed to reset password';
                    throw new Error(errorMsg);
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
                    // API interceptor adds token automatically if it exists in store/storage usually,
                    // but here we are reading FROM store directly to check correctness.
                    // api.ts reads from AsyncStorage 'auth-storage'.
                    // So we rely on api.ts interceptor.

                    const res = await api.get('/auth/me');
                    const user = res.data;

                    set({
                        user: { ...user, id: user._id },
                        role: user.role,
                        verificationStatus: user.verificationStatus,
                        isLoading: false
                    });
                } catch (error) {
                    console.error('Auth check failed:', error);
                    get().logout();
                    set({ isLoading: false });
                }
            },

            deleteAccount: async () => {
                set({ isLoading: true });
                try {
                    await api.delete('/auth/delete');
                    get().logout();
                } catch (error: any) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            submitVerification: async (docs) => {
                set({ isLoading: true });
                try {
                    // Upload images first
                    const uploadedDocs: any = { ...docs };
                    const uploadPromises = Object.keys(docs).map(async (key) => {
                        const uri = (docs as any)[key];
                        if (uri && !uri.startsWith('http') && !uri.startsWith('data:')) { // Only upload if local URI
                            try {
                                const url = await require('../services/uploadService').uploadImage(uri);
                                uploadedDocs[key] = url;
                            } catch (err) {
                                console.error(`Failed to upload ${key}`, err);
                                throw new Error(`Failed to upload ${key}`);
                            }
                        }
                    });

                    await Promise.all(uploadPromises);

                    const res = await api.post('/auth/verify', uploadedDocs);
                    const updatedUser = res.data;

                    set((state) => ({
                        user: { ...state.user!, ...updatedUser },
                        verificationStatus: 'pending',
                        isLoading: false
                    }));
                } catch (error: any) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            setVerificationStatus: (status) => set({ verificationStatus: status }),
            updateDocuments: (docs) => set((state) => ({ documents: { ...state.documents, ...docs } })),

            updateProfile: async (data) => {
                set({ isLoading: true });
                try {
                    const res = await api.put('/auth/update', data);
                    const updatedUser = res.data;

                    set((state) => ({
                        user: { ...state.user!, ...updatedUser },
                        isLoading: false
                    }));
                } catch (error: any) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            changePassword: async (oldPassword, newPassword) => {
                set({ isLoading: true });
                try {
                    await api.post('/auth/change-password', { oldPassword, newPassword });
                    set({ isLoading: false });
                } catch (error: any) {
                    set({ isLoading: false });
                    const errorMsg = error.response?.data?.msg || error.response?.data?.message || 'Failed to change password';
                    throw new Error(errorMsg);
                }
            },

            addSavedPlace: async (place) => {
                set({ isLoading: true });
                try {
                    const res = await api.post('/auth/places', place);
                    const savedPlaces = res.data;
                    set((state) => ({
                        user: { ...state.user!, savedPlaces },
                        isLoading: false
                    }));
                } catch (error: any) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            removeSavedPlace: async (placeId) => {
                set({ isLoading: true });
                try {
                    const res = await api.delete(`/auth/places/${placeId}`);
                    const savedPlaces = res.data;
                    set((state) => ({
                        user: { ...state.user!, savedPlaces },
                        isLoading: false
                    }));
                } catch (error: any) {
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
