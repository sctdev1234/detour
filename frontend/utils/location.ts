import { LatLng } from '../store/useTripStore';

/**
 * Calculates the Haversine distance between two points in kilometers.
 */
export const calculateDistance = (point1: LatLng, point2: LatLng): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10;
};

/**
 * Estimates duration in minutes based on distance and average speed.
 * @param distanceKm Distance in kilometers
 * @param avgSpeedKmH Average speed in km/h (default 50)
 */
export const estimateDuration = (distanceKm: number, avgSpeedKmH: number = 50): number => {
    const hours = distanceKm / avgSpeedKmH;
    return Math.round(hours * 60);
};

/**
 * Formats duration from minutes to a friendly string (e.g., "1h 15m")
 */
export const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};
