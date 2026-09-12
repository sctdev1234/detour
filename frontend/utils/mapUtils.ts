import { LatLng, Route, RoutePolyline, Trip } from '../types';
import { calculateDistance, decodePolyline } from './location';

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

/**
 * Canonical transformation layer to convert Route models into RoutePolyline objects for map rendering.
 * Enforces explicit selectedRouteId hierarchy:
 * - Selected route: thicker line, high zIndex, primary theme color, full opacity.
 * - Non-selected routes: secondary color, visible, tappable, lower zIndex.
 */
export const formatRoutesToPolylines = (
    routes: (Route | any)[] = [],
    selectedRouteId: string | null = null,
    options?: {
        theme?: any;
        isDark?: boolean;
        primaryColor?: string;
        secondaryColor?: string;
    }
): RoutePolyline[] => {
    if (!Array.isArray(routes) || routes.length === 0) return [];

    const isDark = options?.isDark ?? false;
    const defaultPrimary = options?.primaryColor || options?.theme?.primary || '#3b82f6';
    const ROUTE_COLORS = [
        'rgba(99, 102, 241, 0.85)', // Indigo
        'rgba(236, 72, 153, 0.85)', // Pink
        'rgba(20, 184, 166, 0.85)', // Teal
        'rgba(245, 158, 11, 0.85)', // Amber
        'rgba(139, 92, 246, 0.85)', // Violet
        'rgba(6, 182, 212, 0.85)',  // Cyan
        'rgba(16, 185, 129, 0.85)', // Emerald
        'rgba(244, 63, 94, 0.85)'   // Rose
    ];

    return routes.map((r: any, index: number) => {
        const routeId = r.id || r._id || '';
        const isSelected = selectedRouteId === routeId;
        const isActive = r.status === 'active';
        const defaultSecondary = ROUTE_COLORS[index % ROUTE_COLORS.length];

        const startP = (r.startPoint?.latitude !== undefined && r.startPoint.latitude !== 0 && r.startPoint.longitude !== 0)
            ? r.startPoint
            : (r.startPoint?.coordinates && Array.isArray(r.startPoint.coordinates) && r.startPoint.coordinates.length >= 2)
                ? { latitude: r.startPoint.coordinates[1], longitude: r.startPoint.coordinates[0], address: r.startPoint.address }
                : null;

        const endP = (r.endPoint?.latitude !== undefined && r.endPoint.latitude !== 0 && r.endPoint.longitude !== 0)
            ? r.endPoint
            : (r.endPoint?.coordinates && Array.isArray(r.endPoint.coordinates) && r.endPoint.coordinates.length >= 2)
                ? { latitude: r.endPoint.coordinates[1], longitude: r.endPoint.coordinates[0], address: r.endPoint.address }
                : null;

        let coords: LatLng[] = [];
        if (r.routeGeometry && typeof r.routeGeometry === 'string' && !r.routeGeometry.startsWith('mock_polyline_')) {
            coords = decodePolyline(r.routeGeometry);
        } else if (startP && endP) {
            coords = [
                startP,
                ...(r.waypoints || []).map((wp: any) => {
                    if (wp?.latitude !== undefined && wp.latitude !== 0) return wp;
                    if (wp?.coordinates && Array.isArray(wp.coordinates) && wp.coordinates.length >= 2) {
                        return { latitude: wp.coordinates[1], longitude: wp.coordinates[0], address: wp.address };
                    }
                    return null;
                }).filter(Boolean),
                endP,
            ];
        }

        const validCoords = coords.filter(p => p && typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude !== 0 && p.longitude !== 0);

        return {
            id: routeId,
            coords: validCoords,
            isActive,
            isSelected,
            isDriverRoute: r.role === 'driver',
            color: isSelected ? defaultPrimary : defaultSecondary,
            width: isSelected ? 6 : 4,
            zIndex: isSelected ? 10 : 2,
            startPoint: startP,
            endPoint: endP,
        };
    });
};

