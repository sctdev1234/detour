import { useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useRatingStore } from '../store/useRatingStore';
import { useTrips } from './api/useTripQueries';
import { getNextTripOccurrence, IN_PROGRESS_STATUSES } from '../utils/timeUtils';

export function useDriverDashboardStats() {
    const { user } = useAuthStore();
    const { data: allTrips } = useTrips();
    const getAverageRating = useRatingStore((state) => state.getAverageRating);
    const rating = getAverageRating(user?.id || '');

    const stats = useMemo(() => {
        const driverTrips = allTrips?.filter((t: any) =>
            t.driverId?._id === user?.id ||
            t.driverId?.id === user?.id ||
            t.driverId === user?.id
        ) || [];

        let nextTripDate: Date | null = null;
        let nextTripRef: any = null;

        driverTrips.forEach((t: any) => {
            if (t.status === 'COMPLETED' || t.status === 'CANCELLED' || t.status === 'completed' || t.status === 'cancelled') return;
            if (IN_PROGRESS_STATUSES.includes(t.status) || t.status === 'active') return;

            const occurrence = getNextTripOccurrence(t.routeId?.timeStart, t.routeId?.days);
            if (occurrence) {
                if (!nextTripDate || occurrence.getTime() < nextTripDate.getTime()) {
                    nextTripDate = occurrence;
                    nextTripRef = t;
                }
            }
        });

        const weeklyPotential = driverTrips.reduce(
            (acc: number, t: any) => acc + ((t.routeId?.price || 0) * (t.routeId?.days?.length || 0)),
            0
        );

        return {
            totalRoutes: driverTrips.length,
            weeklyPotential,
            nextTripDate,
            nextTripRef,
        };
    }, [allTrips, user?.id]);

    return {
        ...stats,
        rating,
    };
}
