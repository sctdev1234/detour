import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from 'firebase/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Role = 'driver' | 'client' | null;

interface AuthState {
    user: User | null;
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
    setUser: (user: User | null) => void;
    setRole: (role: Role) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
    setVerificationStatus: (status: 'pending' | 'verified' | 'rejected' | 'unverified') => void;
    updateDocuments: (docs: Partial<AuthState['documents']>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            role: null,
            verificationStatus: 'unverified',
            documents: {},
            isLoading: true,
            setUser: (user) => set({ user, isLoading: false }),
            setRole: (role) => set({ role }),
            setLoading: (isLoading) => set({ isLoading }),
            logout: () => set({ user: null, role: null, isLoading: false, verificationStatus: 'unverified', documents: {} }),
            setVerificationStatus: (status) => set({ verificationStatus: status }),
            updateDocuments: (docs) => set((state) => ({ documents: { ...state.documents, ...docs } })),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ role: state.role }), // Only persist the role, user comes from Firebase
        }
    )
);
