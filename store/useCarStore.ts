import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { API_URL } from '../services/apiConfig';
// import { useAuthStore } from './useAuthStore'; // Circular dependency risk if not careful, likely need user ID passed in

export interface Car {
    id: string; // MongoDB _id
    marque: string;
    model: string;
    year: string;
    color: string;
    places: number;
    isDefault: boolean;
    images: string[];
    documents: {
        registration?: string;
        insurance?: string;
        technicalVisit?: string;
    };
    ownerId: string;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'unverified';
    assignment?: {
        driverEmail: string;
        profitSplit: number; // 0-100
        startDate: string;
        status: 'active' | 'pending' | 'ended';
    };
}

interface CarState {
    cars: Car[];
    addCar: (car: Omit<Car, 'id' | 'ownerId' | 'verificationStatus'>, ownerId: string) => Promise<void>;
    fetchCars: (ownerId: string) => Promise<void>;
    removeCar: (id: string) => void;
    setDefaultCar: (id: string) => void;
    updateCar: (id: string, updates: Partial<Car>) => void;
    assignCar: (id: string, assignment: Car['assignment']) => void;
    revokeAssignment: (id: string) => void;
}

export const useCarStore = create<CarState>()(
    persist(
        (set, get) => ({
            cars: [],

            fetchCars: async (ownerId) => {
                try {
                    const res = await fetch(`${API_URL}/cars?ownerId=${ownerId}`);
                    if (res.ok) {
                        const data = await res.json();
                        // Transform _id to id
                        const cars = data.map((c: any) => ({ ...c, id: c._id }));
                        set({ cars });
                    }
                } catch (error) {
                    console.error("Failed to fetch cars", error);
                }
            },

            addCar: async (carData, ownerId) => {
                try {
                    const res = await fetch(`${API_URL}/cars`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...carData, ownerId })
                    });

                    if (!res.ok) {
                        throw new Error('Failed to create car');
                    }

                    const newCar = await res.json();

                    set((state) => {
                        // Transform _id to id if needed, or backend ensures it
                        const carWithId = { ...newCar, id: newCar._id || newCar.id };

                        const updatedCars = state.cars.map(c =>
                            newCar.isDefault ? { ...c, isDefault: false } : c
                        );
                        return { cars: [...updatedCars, carWithId] };
                    });
                } catch (error) {
                    console.error("Failed to add car", error);
                    throw error;
                }
            },

            removeCar: (id) => set((state) => ({
                cars: state.cars.filter((c) => c.id !== id),
            })),
            setDefaultCar: (id) => set((state) => ({
                cars: state.cars.map((c) => ({
                    ...c,
                    isDefault: c.id === id,
                })),
            })),
            updateCar: (id, updates) => set((state) => ({
                cars: state.cars.map((c) => (c.id === id ? { ...c, ...updates } : c)),
            })),
            assignCar: (id, assignment) => set((state) => ({
                cars: state.cars.map((c) => (c.id === id ? { ...c, assignment } : c)),
            })),
            revokeAssignment: (id) => set((state) => ({
                cars: state.cars.map((c) => {
                    if (c.id === id && c.assignment) {
                        return { ...c, assignment: { ...c.assignment, status: 'ended' } };
                    }
                    return c;
                }),
            })),
        }),
        {
            name: 'car-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
