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

export const getRegionForCoordinates = (points: LatLng[], padding = 1.1) => {
    if (!points.length) return undefined;

    let minLat: number | undefined, maxLat: number | undefined, minLng: number | undefined, maxLng: number | undefined;
    points.forEach((point) => {
        minLat = minLat === undefined ? point.latitude : Math.min(minLat, point.latitude);
        maxLat = maxLat === undefined ? point.latitude : Math.max(maxLat, point.latitude);
        minLng = minLng === undefined ? point.longitude : Math.min(minLng, point.longitude);
        maxLng = maxLng === undefined ? point.longitude : Math.max(maxLng, point.longitude);
    });

    if (minLat === undefined || maxLat === undefined || minLng === undefined || maxLng === undefined) return undefined;

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const deltaLat = (maxLat - minLat);
    const deltaLng = (maxLng - minLng);

    return {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.max(deltaLat * padding, 0.05),
        longitudeDelta: Math.max(deltaLng * padding, 0.05),
    };
};

export const decodePolyline = (encoded: string): LatLng[] => {
    if (!encoded) {
        return [];
    }
    const poly: LatLng[] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        const p = {
            latitude: lat / 1e5,
            longitude: lng / 1e5,
        };
        poly.push(p);
    }
    return poly;
};
