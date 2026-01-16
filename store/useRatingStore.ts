import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Rating {
    id: string;
    tripId: string;
    raterId: string;
    targetId: string;
    rating: number; // 1-5
    comment?: string;
    createdAt: number;
}

interface RatingState {
    ratings: Rating[];
    addRating: (rating: Omit<Rating, 'id' | 'createdAt'>) => void;
    getAverageRating: (userId: string) => number;
    getUserRatings: (userId: string) => Rating[];
}

export const useRatingStore = create<RatingState>()(
    persist(
        (set, get) => ({
            ratings: [],
            addRating: (newRating) => {
                const rating: Rating = {
                    ...newRating,
                    id: Math.random().toString(36).substring(7),
                    createdAt: Date.now(),
                };
                set((state) => ({
                    ratings: [...state.ratings, rating],
                }));
            },
            getAverageRating: (userId) => {
                const userRatings = get().ratings.filter((r) => r.targetId === userId);
                if (userRatings.length === 0) return 0;
                const sum = userRatings.reduce((acc, curr) => acc + curr.rating, 0);
                return parseFloat((sum / userRatings.length).toFixed(1));
            },
            getUserRatings: (userId) => {
                return get().ratings.filter((r) => r.targetId === userId);
            },
        }),
        {
            name: 'rating-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
