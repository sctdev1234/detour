import { decodePolyline } from '../utils/location';

// Google Maps implementation of Route Service

interface RouteResult {
    distanceKm: number;
    durationMinutes: number;
    geometry: string; // Polyline string
}

const getApiKey = () => {
    return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
};

export const RouteService = {
    calculateRoute: async (start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }): Promise<RouteResult> => {
        const apiKey = getApiKey();
        
        if (apiKey) {
            const origin = `${start.latitude},${start.longitude}`;
            const destination = `${end.latitude},${end.longitude}`;
            
            // departure_time=now enables traffic routing
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&departure_time=now&key=${apiKey}`;
            
            console.log(`[Google Maps] 🗺️ Requesting Directions: ${origin} -> ${destination}`);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        const leg = route.legs[0];
                        
                        const distanceKm = leg.distance.value / 1000;
                        const durationSeconds = leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value;
                        const durationMinutes = Math.ceil(durationSeconds / 60);
                        
                        console.log(`[Google Maps] ✅ Directions Success! Distance: ${distanceKm}km, Duration: ${durationMinutes}min`);
                        
                        return {
                            distanceKm: parseFloat(distanceKm.toFixed(2)),
                            durationMinutes,
                            geometry: route.overview_polyline.points
                        };
                    }
                }
            } catch (error) {
                console.warn("Google Maps routing failed, trying fallback...", error);
            }
        }

        // Fallback: Haversine formula if API fails or key is missing
        const R = 6371; // Earth radius in km
        const dLat = (end.latitude - start.latitude) * Math.PI / 180;
        const dLon = (end.longitude - start.longitude) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(start.latitude * Math.PI / 180) * Math.cos(end.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        // Conservative fallback duration: Assume average speed of 30 km/h in city traffic
        const durationMinutes = (distanceKm / 30) * 60;

        return {
            distanceKm: parseFloat(distanceKm.toFixed(2)),
            durationMinutes: Math.ceil(durationMinutes),
            geometry: ''
        };
    },

    fetchRoadRoute: async (
        start: { latitude: number; longitude: number }, 
        end: { latitude: number; longitude: number }, 
        waypoints: { latitude: number; longitude: number }[] = []
    ): Promise<{ latitude: number; longitude: number }[]> => {
        const apiKey = getApiKey();
        if (!apiKey) return [];

        const origin = `${start.latitude},${start.longitude}`;
        const destination = `${end.latitude},${end.longitude}`;
        const waypointsStr = waypoints.length > 0 
            ? `&waypoints=${waypoints.map(w => `${w.latitude},${w.longitude}`).join('|')}` 
            : '';

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsStr}&key=${apiKey}`;

        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'OK' && data.routes && data.routes.length > 0) {
                    const encodedPolyline = data.routes[0].overview_polyline.points;
                    return decodePolyline(encodedPolyline);
                }
            }
        } catch (error) {
            console.warn("fetchRoadRoute error:", error);
        }

        // Fallback: Straight line if API fails
        return [start, ...waypoints, end];
    },

    estimatePrice: (distanceKm: number, model: 'fixed' | 'per_km', perKmRate?: number) => {
        if (model === 'fixed') return 0; // User sets manually
        return (distanceKm * (perKmRate || 2)).toFixed(2); // Default 2 MAD/km
    },

    reverseGeocode: async (lat: number, lng: number, signal?: AbortSignal): Promise<string> => {
        const apiKey = getApiKey();
        const fallback = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        if (!apiKey) return fallback;

        try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`, {
                signal
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'OK' && data.results && data.results.length > 0) {
                    // Try to return a concise address if possible, otherwise formatted_address
                    const result = data.results[0];
                    return result.formatted_address;
                }
            }
            return fallback;
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Geocoding error:', error);
            }
            return fallback;
        }
    },

    geocode: async (query: string, signal?: AbortSignal): Promise<{ placeId?: string; label: string; subtitle?: string; latitude?: number; longitude?: number }[]> => {
        const apiKey = getApiKey();
        if (!apiKey || !query.trim()) return [];

        console.log(`[Google Maps] 🔍 Autocomplete Search for: "${query}"`);

        try {
            // Using Google Places API (New)
            const response = await fetch(`https://places.googleapis.com/v1/places:autocomplete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                },
                body: JSON.stringify({
                    input: query,
                    includedRegionCodes: ['MA']
                }),
                signal
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.suggestions) {
                    console.log(`[Google Maps] ✅ Found ${data.suggestions.length} predictions for "${query}"`);
                    return data.suggestions.map((s: any) => {
                        const pred = s.placePrediction;
                        return {
                            placeId: pred.placeId,
                            label: pred.structuredFormat?.mainText?.text || pred.text?.text || query,
                            subtitle: pred.structuredFormat?.secondaryText?.text || '',
                        };
                    });
                } else {
                    console.log(`[Google Maps] ⚠️ No suggestions found or API Error.`, data);
                }
            } else {
                const text = await response.text();
                console.error(`[Google Maps] ❌ HTTP Error ${response.status}:`, text);
            }
            return [];
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Autocomplete search error:', error);
            }
            return [];
        }
    },

    getPlaceDetails: async (placeId: string, signal?: AbortSignal): Promise<{ latitude: number; longitude: number } | null> => {
        const apiKey = getApiKey();
        if (!apiKey || !placeId) return null;

        console.log(`[Google Maps] 📍 Fetching Details for Place ID: "${placeId}"`);

        try {
            const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=location`, {
                method: 'GET',
                headers: {
                    'X-Goog-Api-Key': apiKey,
                },
                signal
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.location) {
                    return {
                        latitude: data.location.latitude,
                        longitude: data.location.longitude
                    };
                }
            } else {
                const text = await response.text();
                console.error(`[Google Maps] ❌ Details HTTP Error ${response.status}:`, text);
            }
            return null;
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Place details error:', error);
            }
            return null;
        }
    }
};
