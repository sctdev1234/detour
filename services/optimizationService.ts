import { ClientRequest } from '../store/useClientRequestStore';
import { LatLng, Trip } from '../store/useTripStore';
import { calculateDistance } from '../utils/location';

/**
 * Calculates the extra distance (detour) required to serve a client request.
 * Assumes simple insertion: Driver Start -> Client Start -> Client End -> Driver End
 * 
 * @param driverStart Driver's trip start point
 * @param driverEnd Driver's trip end point
 * @param clientStart Client's pickup point
 * @param clientEnd Client's dropoff point
 * @returns Detour in km
 */
export const calculateDetour = (
    driverStart: LatLng,
    driverEnd: LatLng,
    clientStart: LatLng,
    clientEnd: LatLng
): number => {
    // Current direct distance
    const originalDist = calculateDistance(driverStart, driverEnd);

    // New distance with stops
    const leg1 = calculateDistance(driverStart, clientStart);
    const leg2 = calculateDistance(clientStart, clientEnd); // Client's trip distance
    const leg3 = calculateDistance(clientEnd, driverEnd);

    const newDist = leg1 + leg2 + leg3;

    return Math.round((newDist - originalDist) * 10) / 10;
};

/**
 * Ranks client requests based on minimizing detour impact.
 * 
 * @param driverTrip The driver's trip
 * @param requests List of available client requests
 * @returns List of requests sorted by best match (lowest detour)
 */
export const rankRequestsByDetour = (driverTrip: Trip, requests: ClientRequest[]): (ClientRequest & { detour: number })[] => {
    return requests
        .map(req => {
            const detour = calculateDetour(
                driverTrip.startPoint,
                driverTrip.endPoint,
                req.startPoint,
                req.endPoint
            );
            return { ...req, detour };
        })
        .sort((a, b) => a.detour - b.detour);
};
