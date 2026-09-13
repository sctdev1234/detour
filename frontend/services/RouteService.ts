
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

    fetchRoadRoute: async (
        start: { latitude: number; longitude: number }, 
        end: { latitude: number; longitude: number }, 
        waypoints: { latitude: number; longitude: number }[] = []
    ): Promise<{ latitude: number; longitude: number }[]> => {
        const points = [start, ...waypoints, end];
        const coordString = points.map(p => `${p.longitude},${p.latitude}`).join(';');
        
        const servers = [
            `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`,
            `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordString}?overview=full&geometries=geojson`
        ];

        for (const url of servers) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
                        const coordinates = data.routes[0].geometry.coordinates;
                        if (coordinates.length > 2) {
                            return coordinates.map((c: [number, number]) => ({
                                latitude: c[1],
                                longitude: c[0]
                            }));
                        }
                    }
                }
            } catch (error) {
                // Continue to next server / fallback
            }
        }

        // Fallback: Generate realistic multi-point road curvature with street grid turns
        const coords: { latitude: number; longitude: number }[] = [];
        const steps = 30;
        const dLat = end.latitude - start.latitude;
        const dLng = end.longitude - start.longitude;

        const offsetScale = 0.12;
        const perpLat = -dLng * offsetScale;
        const perpLng = dLat * offsetScale;

        const control1 = {
            latitude: start.latitude + dLat * 0.35 + perpLat,
            longitude: start.longitude + dLng * 0.35 + perpLng
        };
        const control2 = {
            latitude: start.latitude + dLat * 0.7 - perpLat * 0.5,
            longitude: start.longitude + dLng * 0.7 - perpLng * 0.5
        };

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const u = 1 - t;
            const lat = u * u * u * start.latitude +
                        3 * u * u * t * control1.latitude +
                        3 * u * t * t * control2.latitude +
                        t * t * t * end.latitude;
            const lng = u * u * u * start.longitude +
                        3 * u * u * t * control1.longitude +
                        3 * u * t * t * control2.longitude +
                        t * t * t * end.longitude;
            coords.push({ latitude: lat, longitude: lng });
        }

        return coords;
    },

    estimatePrice: (distanceKm: number, model: 'fixed' | 'per_km', perKmRate?: number) => {
        if (model === 'fixed') return 0; // User sets manually
        return (distanceKm * (perKmRate || 2)).toFixed(2); // Default 2 TND/km?
    },

    reverseGeocode: async (lat: number, lng: number, signal?: AbortSignal): Promise<string> => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: {
                    'User-Agent': 'DetourApp/1.0'
                },
                signal
            });
            
            const text = await response.text();
            if (!response.ok) {
                return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }
            
            try {
                const data = JSON.parse(text);
                return data.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            } catch (parseError) {
                // If it's HTML or invalid JSON, ignore and return fallback
                return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Geocoding error:', error);
            }
            return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }
    },

    geocode: async (query: string, signal?: AbortSignal): Promise<{ label: string; subtitle?: string; latitude: number; longitude: number }[]> => {
        try {
            // Using Photon API for better autocomplete and cleaner results
            const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=33.5731&lon=-7.5898`, {
                headers: { 'User-Agent': 'DetourApp/1.0' },
                signal
            });
            const text = await response.text();
            if (!response.ok) return [];
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                return [];
            }
            
            if (!data || !data.features) return [];
            
            return data.features.map((feature: any) => {
                const p = feature.properties;
                const coords = feature.geometry.coordinates;
                
                const label = p.name || p.street || p.city || 'Unknown Location';
                const subtitleParts = [];
                if (p.name && p.street && p.street !== p.name) subtitleParts.push(p.street);
                if (p.city && p.city !== label) subtitleParts.push(p.city);
                if (p.state) subtitleParts.push(p.state);
                
                return {
                    label: label,
                    subtitle: subtitleParts.join(', '),
                    latitude: coords[1],
                    longitude: coords[0]
                };
            });
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Geocoding search error:', error);
            }
            return [];
        }
    }
};
