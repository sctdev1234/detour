import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../services/api';

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
    removeCar: (id: string) => Promise<void>;
    setDefaultCar: (id: string) => Promise<void>;
    updateCar: (id: string, updates: Partial<Car>) => Promise<void>;
    assignCar: (id: string, assignment: Car['assignment']) => Promise<void>;
    revokeAssignment: (id: string) => Promise<void>;
}

export const useCarStore = create<CarState>()(
    persist(
        (set, get) => ({
            cars: [],

            fetchCars: async (ownerId) => {
                try {
                    const res = await api.get(`/cars?ownerId=${ownerId}`);
                    // Map _id to id
                    const cars = res.data.map((c: any) => ({ ...c, id: c._id }));
                    set({ cars });
                } catch (error) {
                    console.error("Failed to fetch cars", error);
                }
            },

            addCar: async (carData, ownerId) => {
                try {
                    const res = await api.post('/cars', { ...carData, ownerId });
                    const newCar = res.data;

                    set((state) => {
                        // Map _id in response to id
                        const carWithId = { ...newCar, id: newCar._id || newCar.id };

                        const updatedCars = state.cars.map(c =>
                            (newCar.isDefault && c.id !== carWithId.id) ? { ...c, isDefault: false } : c
                        );
                        return { cars: [...updatedCars, carWithId] };
                    });
                } catch (error: any) {
                    console.error("Failed to add car", error.response?.data || error.message);
                    throw error;
                }
            },

            removeCar: async (id) => {
                try {
                    await api.delete(`/cars/${id}`);
                    set((state) => ({
                        cars: state.cars.filter((c) => c.id !== id),
                    }));
                } catch (error) {
                    console.error("Failed to remove car", error);
                }
            },

            setDefaultCar: async (id) => {
                try {
                    // Update all cars locally first for speed
                    set((state) => ({
                        cars: state.cars.map((c) => ({
                            ...c,
                            isDefault: c.id === id,
                        })),
                    }));

                    await api.patch(`/cars/${id}`, { isDefault: true });
                } catch (error) {
                    console.error("Failed to set default car", error);
                }
            },

            updateCar: async (id, updates) => {
                try {
                    await api.patch(`/cars/${id}`, updates);
                    set((state) => ({
                        cars: state.cars.map((c) => (c.id === id ? { ...c, ...updates } : c)),
                    }));
                } catch (error) {
                    console.error("Failed to update car", error);
                }
            },

            assignCar: async (id, assignment) => {
                try {
                    await api.patch(`/cars/${id}`, { assignment });
                    set((state) => ({
                        cars: state.cars.map((c) => (c.id === id ? { ...c, assignment } : c)),
                    }));
                } catch (error) {
                    console.error("Failed to assign car", error);
                }
            },

            revokeAssignment: async (id) => {
                try {
                    const car = get().cars.find(c => c.id === id);
                    if (car && car.assignment) {
                        const updatedAssignment = { ...car.assignment, status: 'ended' };

                        await api.patch(`/cars/${id}`, { assignment: updatedAssignment });

                        set((state) => ({
                            cars: state.cars.map((c) => {
                                if (c.id === id && c.assignment) {
                                    return { ...c, assignment: { ...c.assignment, status: 'ended' as const } };
                                }
                                return c;
                            }),
                        }));
                    }
                } catch (error) {
                    console.error("Failed to revoke assignment", error);
                }
            },
        }),
        {
            name: 'car-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
