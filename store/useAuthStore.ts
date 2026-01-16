import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from 'firebase/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Role = 'driver' | 'client' | null;

interface AuthState {
    user: User | null;
    role: Role;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setRole: (role: Role) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            role: null,
            isLoading: true,
            setUser: (user) => set({ user, isLoading: false }),
            setRole: (role) => set({ role }),
            setLoading: (isLoading) => set({ isLoading }),
            logout: () => set({ user: null, role: null, isLoading: false }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ role: state.role }), // Only persist the role, user comes from Firebase
        }
    )
);
