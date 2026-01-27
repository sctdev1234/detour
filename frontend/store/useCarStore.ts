import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { API_URL } from '../services/apiConfig';

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
                    // Assuming GET /api/cars?ownerId=...
                    const res = await fetch(`${API_URL}/cars?ownerId=${ownerId}`, {
                        headers: { 'Bypass-Tunnel-Reminder': 'true' }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // Map _id to id
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
                        headers: {
                            'Content-Type': 'application/json',
                            'Bypass-Tunnel-Reminder': 'true'
                        },
                        body: JSON.stringify({ ...carData, ownerId })
                    });

                    if (!res.ok) {
                        const errText = await res.text();
                        throw new Error(`Failed to create car: ${errText}`);
                    }

                    const newCar = await res.json();

                    set((state) => {
                        // Map _id in response to id
                        const carWithId = { ...newCar, id: newCar._id || newCar.id };

                        const updatedCars = state.cars.map(c =>
                            (newCar.isDefault && c.id !== carWithId.id) ? { ...c, isDefault: false } : c
                        );
                        return { cars: [...updatedCars, carWithId] };
                    });
                } catch (error) {
                    console.error("Failed to add car", error);
                    throw error;
                }
            },

            removeCar: async (id) => {
                try {
                    const res = await fetch(`${API_URL}/cars/${id}`, {
                        method: 'DELETE',
                        headers: { 'Bypass-Tunnel-Reminder': 'true' }
                    });
                    if (res.ok) {
                        set((state) => ({
                            cars: state.cars.filter((c) => c.id !== id),
                        }));
                    }
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

                    // Call API to persist
                    // We might need a specific endpoint or just update the specific car
                    // Simplifying by just updating the one car for now if API doesn't handle batch
                    await fetch(`${API_URL}/cars/${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Bypass-Tunnel-Reminder': 'true'
                        },
                        body: JSON.stringify({ isDefault: true })
                    });
                } catch (error) {
                    console.error("Failed to set default car", error);
                }
            },

            updateCar: async (id, updates) => {
                try {
                    const res = await fetch(`${API_URL}/cars/${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Bypass-Tunnel-Reminder': 'true'
                        },
                        body: JSON.stringify(updates)
                    });

                    if (res.ok) {
                        set((state) => ({
                            cars: state.cars.map((c) => (c.id === id ? { ...c, ...updates } : c)),
                        }));
                    }
                } catch (error) {
                    console.error("Failed to update car", error);
                }
            },

            assignCar: async (id, assignment) => {
                try {
                    const res = await fetch(`${API_URL}/cars/${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Bypass-Tunnel-Reminder': 'true'
                        },
                        body: JSON.stringify({ assignment })
                    });
                    if (res.ok) {
                        set((state) => ({
                            cars: state.cars.map((c) => (c.id === id ? { ...c, assignment } : c)),
                        }));
                    }
                } catch (error) {
                    console.error("Failed to assign car", error);
                }
            },

            revokeAssignment: async (id) => {
                try {
                    const car = get().cars.find(c => c.id === id);
                    if (car && car.assignment) {
                        const updatedAssignment = { ...car.assignment, status: 'ended' };

                        const res = await fetch(`${API_URL}/cars/${id}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'Bypass-Tunnel-Reminder': 'true'
                            },
                            body: JSON.stringify({ assignment: updatedAssignment })
                        });

                        if (res.ok) {
                            set((state) => ({
                                cars: state.cars.map((c) => {
                                    if (c.id === id && c.assignment) {
                                        return { ...c, assignment: { ...c.assignment, status: 'ended' as const } };
                                    }
                                    return c;
                                }),
                            }));
                        }
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
