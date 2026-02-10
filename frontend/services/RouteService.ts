
// Mock implementation of a Route Service
// In production, this would call OSRM

interface RouteResult {
    distanceKm: number;
    durationMinutes: number;
    geometry: string; // Polyline string
}

export const RouteService = {
    calculateRoute: async (start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }): Promise<RouteResult> => {
        // Mock calculation using Haversine formula for distance and random speed for duration
        const R = 6371; // Earth radius in km
        const dLat = (end.latitude - start.latitude) * Math.PI / 180;
        const dLon = (end.longitude - start.longitude) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(start.latitude * Math.PI / 180) * Math.cos(end.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        // Assume average speed of 40 km/h in city
        const durationMinutes = (distanceKm / 40) * 60;

        // Mock geometry (straight line)
        // In reality, this would be a complex polyline string
        const geometry = `mock_polyline_${start.latitude},${start.longitude}_${end.latitude},${end.longitude}`;

        // Artificial delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            distanceKm: parseFloat(distanceKm.toFixed(2)),
            durationMinutes: Math.ceil(durationMinutes),
            geometry
        };
    },

    estimatePrice: (distanceKm: number, model: 'fixed' | 'per_km', perKmRate?: number) => {
        if (model === 'fixed') return 0; // User sets manually
        return (distanceKm * (perKmRate || 2)).toFixed(2); // Default 2 TND/km?
    },

    reverseGeocode: async (lat: number, lng: number): Promise<string> => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: {
                    'User-Agent': 'DetourApp/1.0'
                }
            });
            const data = await response.json();
            return data.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        } catch (error) {
            console.error('Geocoding error:', error);
            return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }
    }
};
