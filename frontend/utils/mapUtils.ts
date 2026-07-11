import { LatLng, Trip } from '../types';
import { calculateDistance } from './location';

export interface RoutePoint {
    lat: number;
    lon: number;
    type: 'pickup' | 'waypoint' | 'dropoff';
    clientIndex?: number;
    address?: string;
}

export const optimizeRoute = (
    startPoint: LatLng | undefined,
    endPoint: LatLng | undefined,
    waypoints: LatLng[] = [],
    clients: any[] = []
): { sortedPoints: RoutePoint[], routeCoordinates: LatLng[] } => {

    const intermediatePoints: RoutePoint[] = [];

    // Add client pickups
    clients.forEach((client: any, idx: number) => {
        if (client.routeId?.startPoint?.latitude) {
            intermediatePoints.push({
                lat: client.routeId.startPoint.latitude,
                lon: client.routeId.startPoint.longitude,
                type: 'pickup',
                clientIndex: idx,
                address: client.routeId.startPoint.address
            });
        }
    });

    // Add driver waypoints
    waypoints.forEach((wp: LatLng) => {
        if (wp?.latitude) {
            intermediatePoints.push({
                lat: wp.latitude,
                lon: wp.longitude,
                type: 'waypoint',
                address: wp.address
            });
        }
    });

    // Add client dropoffs
    clients.forEach((client: any, idx: number) => {
        if (client.routeId?.endPoint?.latitude) {
            intermediatePoints.push({
                lat: client.routeId.endPoint.latitude,
                lon: client.routeId.endPoint.longitude,
                type: 'dropoff',
                clientIndex: idx,
                address: client.routeId.endPoint.address
            });
        }
    });

    // Sort intermediate points using nearest neighbor algorithm for shortest path
    const sortedPoints: RoutePoint[] = [];
    const remaining = [...intermediatePoints];
    let currentLat = startPoint?.latitude || 0;
    let currentLon = startPoint?.longitude || 0;
    const pickedUp = new Set<number>();

    while (remaining.length > 0) {
        let nearestIdx = -1;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const point = remaining[i];

            // Skip dropoffs if client hasn't been picked up yet
            if (point.type === 'dropoff' && point.clientIndex !== undefined && !pickedUp.has(point.clientIndex)) {
                continue;
            }

            // We need LatLng objects for calculateDistance
            const p1 = { latitude: currentLat, longitude: currentLon } as LatLng;
            const p2 = { latitude: point.lat, longitude: point.lon } as LatLng;

            const dist = calculateDistance(p1, p2);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        if (nearestIdx === -1) break; // Should not happen if logic is correct

        const nextPoint = remaining.splice(nearestIdx, 1)[0];
        sortedPoints.push(nextPoint);

        if (nextPoint.type === 'pickup' && nextPoint.clientIndex !== undefined) {
            pickedUp.add(nextPoint.clientIndex);
        }

        currentLat = nextPoint.lat;
        currentLon = nextPoint.lon;
    }

    // Build route coordinates
    const routeCoordinates: LatLng[] = [];

    if (startPoint?.latitude) {
        routeCoordinates.push(startPoint);
    }

    sortedPoints.forEach(point => {
        routeCoordinates.push({ latitude: point.lat, longitude: point.lon } as LatLng);
    });

    if (endPoint?.latitude) {
        routeCoordinates.push(endPoint);
    }

    return { sortedPoints, routeCoordinates };
};

export const getAllPointsFromTrip = (trip: Trip): LatLng[] => {
    const allPoints: LatLng[] = [];
    const driverRoute = trip?.routeId;

    if (driverRoute?.startPoint?.latitude) allPoints.push(driverRoute.startPoint);
    if (driverRoute?.endPoint?.latitude) allPoints.push(driverRoute.endPoint);

    driverRoute?.waypoints?.forEach((wp: LatLng) => {
        if (wp?.latitude) allPoints.push(wp);
    });

    trip?.clients?.forEach((c: any) => {
        if (c.routeId?.startPoint?.latitude) allPoints.push(c.routeId.startPoint);
        if (c.routeId?.endPoint?.latitude) allPoints.push(c.routeId.endPoint);
    });

    return allPoints;
};

export const calculateOptimalAnnotationAnchor = (
    routeCoords: LatLng[],
    otherAnchors: LatLng[] = []
): LatLng => {
    if (!routeCoords || routeCoords.length === 0) return { latitude: 0, longitude: 0 };
    if (routeCoords.length === 1) return routeCoords[0];
    if (routeCoords.length === 2) {
        return {
            latitude: (routeCoords[0].latitude + routeCoords[1].latitude) / 2,
            longitude: (routeCoords[0].longitude + routeCoords[1].longitude) / 2
        };
    }

    // Candidate fractions along the polyline to try to avoid overlaps
    const candidates = [0.5, 0.4, 0.6, 0.3, 0.7];
    let bestPoint = routeCoords[Math.floor(routeCoords.length / 2)];
    let maxMinDist = -1;

    for (const fraction of candidates) {
        const index = Math.floor(routeCoords.length * fraction);
        const candidate = routeCoords[index];
        if (!candidate) continue;

        if (otherAnchors.length === 0) {
            return candidate;
        }

        let minDist = Infinity;
        for (const other of otherAnchors) {
            const d = calculateDistance(candidate, other);
            if (d < minDist) minDist = d;
        }

        if (minDist > maxMinDist) {
            maxMinDist = minDist;
            bestPoint = candidate;
        }
    }

    return bestPoint;
};
