import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Car {
    id: string;
    marque: string;
    model: string;
    year: string;
    color: string;
    places: number;
    isDefault: boolean;
}

interface CarState {
    cars: Car[];
    addCar: (car: Omit<Car, 'id'>) => void;
    removeCar: (id: string) => void;
    setDefaultCar: (id: string) => void;
    updateCar: (id: string, updates: Partial<Car>) => void;
}

export const useCarStore = create<CarState>()(
    persist(
        (set) => ({
            cars: [],
            addCar: (carData) => set((state) => {
                const id = Math.random().toString(36).substring(7);
                const newCar = { ...carData, id };
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
        }),
        {
            name: 'car-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
