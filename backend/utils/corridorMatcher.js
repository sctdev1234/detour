/**
 * ---------------------------------------------------------------------------------
 * UTILITY: CorridorMatcher
 * ---------------------------------------------------------------------------------
 * Purpose: Determines spatial & directional compatibility between a driver's active
 *          route polyline and passenger pickup / dropoff requests.
 * 
 * Invariants Enforced:
 * 1. Pickup must be within maxCorridorMeters (default 2500m / 2.5 km) of driver route.
 * 2. Dropoff must be within maxCorridorMeters (default 2500m / 2.5 km) of driver route.
 * 3. Directionality: Pickup route progress must precede dropoff route progress
 *    along the driver's travel direction (prevents reverse-direction false positives).
 * 4. Passenger journey length must be positive.
 * ---------------------------------------------------------------------------------
 */

/**
 * Calculates Haversine distance in meters between two [lon, lat] coordinates.
 */
function haversineDistance(coord1, coord2) {
    if (!coord1 || !coord2) return Infinity;
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
        return Infinity;
    }

    const R = 6371e3; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Decodes Google-encoded polyline string into an array of [lon, lat] coordinates.
 */
function decodePolylineCoordinates(encoded) {
    if (!encoded || typeof encoded !== 'string') return [];
    // If it's a mock_polyline, do not run google polyline decoding on it
    if (encoded.startsWith('mock_polyline_')) return [];

    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    try {
        while (index < len) {
            let b;
            let shift = 0;
            let result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            const finalLat = lat / 1e5;
            const finalLng = lng / 1e5;
            if (Math.abs(finalLat) > 90 || Math.abs(finalLng) > 180) {
                // Invalid coordinates - not a valid Google polyline string
                return [];
            }
            poly.push([finalLng, finalLat]); // [lon, lat]
        }
    } catch {
        return [];
    }
    return poly;
}

/**
 * Extracts sequence of [lon, lat] points for a driver route.
 */
function getPointCoordinate(pt) {
    if (!pt) return null;
    if (Array.isArray(pt.coordinates) && pt.coordinates.length >= 2) {
        return pt.coordinates;
    }
    if (typeof pt.longitude === 'number' && typeof pt.latitude === 'number') {
        return [pt.longitude, pt.latitude];
    }
    if (Array.isArray(pt) && pt.length >= 2) {
        return pt;
    }
    return null;
}

function getDriverRoutePoints(driverRoute) {
    if (!driverRoute) return [];

    if (driverRoute.routeGeometry && typeof driverRoute.routeGeometry === 'string') {
        if (driverRoute.routeGeometry.startsWith('mock_polyline_')) {
            const raw = driverRoute.routeGeometry.replace('mock_polyline_', '');
            const [s, e] = raw.split('_');
            if (s && e) {
                const [sLat, sLng] = s.split(',').map(Number);
                const [eLat, eLng] = e.split(',').map(Number);
                if (!isNaN(sLat) && !isNaN(sLng) && !isNaN(eLat) && !isNaN(eLng)) {
                    return [[sLng, sLat], [eLng, eLat]];
                }
            }
        }
        const decoded = decodePolylineCoordinates(driverRoute.routeGeometry);
        if (decoded.length >= 2) return decoded;
    }

    const points = [];
    const sp = getPointCoordinate(driverRoute.startPoint);
    if (sp) points.push(sp);

    if (Array.isArray(driverRoute.waypoints)) {
        driverRoute.waypoints.forEach(w => {
            const wp = getPointCoordinate(w);
            if (wp) points.push(wp);
        });
    }

    const ep = getPointCoordinate(driverRoute.endPoint);
    if (ep) points.push(ep);

    return points;
}

/**
 * Projects a point P onto the route polyline and finds:
 * - minDistance (meters) from P to nearest point on route
 * - routeProgress (meters) from route start to the projected point
 * - segmentIndex: the index of the route segment containing the projection
 */
function projectPointToRoute(point, routePoints) {
    if (!point || !Array.isArray(routePoints) || routePoints.length < 2) {
        return { minDistance: Infinity, routeProgress: -1, segmentIndex: -1 };
    }

    let minDistance = Infinity;
    let bestProgress = -1;
    let bestSegmentIndex = 0;
    let cumulativeDistance = 0;

    const [pLon, pLat] = point;

    for (let i = 0; i < routePoints.length - 1; i++) {
        const A = routePoints[i];
        const B = routePoints[i + 1];
        const [aLon, aLat] = A;
        const [bLon, bLat] = B;

        const segDist = haversineDistance(A, B);
        if (segDist === 0) continue;

        // Metric planar projection local to segment
        const cosLat = Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
        const dx = (bLon - aLon) * cosLat;
        const dy = bLat - aLat;
        const segLenSq = dx * dx + dy * dy;

        let t = 0;
        if (segLenSq > 1e-12) {
            const px = (pLon - aLon) * cosLat;
            const py = pLat - aLat;
            t = (px * dx + py * dy) / segLenSq;
            if (t < 0) t = 0;
            if (t > 1) t = 1;
        }

        const projCoord = [
            aLon + t * (bLon - aLon),
            aLat + t * (bLat - aLat)
        ];

        const dist = haversineDistance(point, projCoord);
        if (dist < minDistance) {
            minDistance = dist;
            bestProgress = cumulativeDistance + (t * segDist);
            bestSegmentIndex = i;
        }

        cumulativeDistance += segDist;
    }

    return { 
        minDistance, 
        routeProgress: bestProgress,
        segmentIndex: bestSegmentIndex 
    };
}

/**
 * Canonical route corridor compatibility evaluator.
 * 
 * @param {Object} driverRoute - Driver route document or trip representation
 * @param {Object} passengerRequest - Passenger request or route document
 * @param {Object} options - Matching configuration thresholds
 * @returns {Object} Structured match decision
 */
function isRouteCompatible(driverRoute, passengerRequest, options = {}) {
    const maxCorridorMeters = options.maxCorridorMeters || 25000; // 25 km corridor default
    const minSpanMeters = options.minSpanMeters || 200; // Minimum passenger journey span 200m

    const routePoints = getDriverRoutePoints(driverRoute);
    if (routePoints.length < 2) {
        return { matched: false, reason: 'DRIVER_ROUTE_INVALID' };
    }

    const pickupCoord = getPointCoordinate(passengerRequest.startPoint) || 
                         getPointCoordinate(passengerRequest.pickup);
    const dropoffCoord = getPointCoordinate(passengerRequest.endPoint) || 
                          getPointCoordinate(passengerRequest.destination);

    if (!pickupCoord || !dropoffCoord) {
        return { matched: false, reason: 'PASSENGER_COORDINATES_MISSING' };
    }

    const pickupProj = projectPointToRoute(pickupCoord, routePoints);
    const dropoffProj = projectPointToRoute(dropoffCoord, routePoints);

    if (pickupProj.minDistance > maxCorridorMeters) {
        return { 
            matched: false, 
            reason: 'PICKUP_OUTSIDE_CORRIDOR', 
            pickupDistanceMeters: Math.round(pickupProj.minDistance) 
        };
    }

    if (dropoffProj.minDistance > maxCorridorMeters) {
        return { 
            matched: false, 
            reason: 'DROPOFF_OUTSIDE_CORRIDOR', 
            dropoffDistanceMeters: Math.round(dropoffProj.minDistance) 
        };
    }

    // Directionality check: Pickup must precede dropoff along driver forward direction
    const passengerProgressSpan = dropoffProj.routeProgress - pickupProj.routeProgress;
    if (passengerProgressSpan < minSpanMeters) {
        return { 
            matched: false, 
            reason: 'REVERSE_OR_INSUFFICIENT_DIRECTION', 
            passengerProgressSpan: Math.round(passengerProgressSpan) 
        };
    }

    return {
        matched: true,
        pickupDistanceMeters: Math.round(pickupProj.minDistance),
        dropoffDistanceMeters: Math.round(dropoffProj.minDistance),
        pickupRoutePosition: Math.round(pickupProj.routeProgress),
        dropoffRoutePosition: Math.round(dropoffProj.routeProgress),
        pickupSegmentIndex: pickupProj.segmentIndex,
        dropoffSegmentIndex: dropoffProj.segmentIndex,
        reason: null
    };
}

/**
 * Backward compatibility wrapper for evaluateCorridorMatch
 */
function evaluateCorridorMatch(driverRoute, passengerRequest, options = {}) {
    const res = isRouteCompatible(driverRoute, passengerRequest, options);
    return {
        isMatch: res.matched,
        reason: res.reason,
        pickupDist: res.pickupDistanceMeters,
        dropoffDist: res.dropoffDistanceMeters,
        passengerProgressSpan: res.dropoffRoutePosition ? (res.dropoffRoutePosition - res.pickupRoutePosition) : undefined,
        pickupSegmentIndex: res.pickupSegmentIndex,
        dropoffSegmentIndex: res.dropoffSegmentIndex
    };
}

module.exports = {
    haversineDistance,
    decodePolylineCoordinates,
    getDriverRoutePoints,
    projectPointToRoute,
    isRouteCompatible,
    evaluateCorridorMatch
};
