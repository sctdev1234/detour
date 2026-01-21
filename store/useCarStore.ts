import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Car {
    id: string;
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
    addCar: (car: Omit<Car, 'id'>) => void;
    removeCar: (id: string) => void;
    setDefaultCar: (id: string) => void;
    updateCar: (id: string, updates: Partial<Car>) => void;
    assignCar: (id: string, assignment: Car['assignment']) => void;
    revokeAssignment: (id: string) => void;
}

export const useCarStore = create<CarState>()(
    persist(
        (set) => ({
            cars: [],
            addCar: (carData) => set((state) => {
                const id = Math.random().toString(36).substring(7);
                const newCar: Car = {
                    ...carData,
                    id,
                    images: carData.images || [],
                    documents: carData.documents || {},
                    verificationStatus: 'unverified'
                };
                // If it's the first car or set as default, update others
                const updatedCars = state.cars.map(c =>
                    newCar.isDefault ? { ...c, isDefault: false } : c
                );
                return { cars: [...updatedCars, newCar] };
            }),
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
