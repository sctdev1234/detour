import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

// Fix for default markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map view updates
function MapUpdater({ selectedTrip }) {
    const map = useMap();

    useEffect(() => {
        if (selectedTrip?.routeId) {
            const start = selectedTrip.routeId.startPoint?.coordinates;
            const end = selectedTrip.routeId.endPoint?.coordinates;

            if (start && end) {
                // LatLng is [lat, lng], but Mongo stores [lng, lat]
                const bounds = L.latLngBounds([
                    [start[1], start[0]],
                    [end[1], end[0]]
                ]);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [selectedTrip, map]);

    return null;
}

function FocusHandler({ focusCoords }) {
    const map = useMap();

    useEffect(() => {
        if (focusCoords) {
            // LatLng is [lat, lng], Mongo is [lng, lat]
            // check if focusCoords is already flipped or not. 
            // Usually passed as [lat, lng] from parent for consistency with Leaflet
            map.flyTo(focusCoords, 16, {
                animate: true,
                duration: 1.5
            });
        }
    }, [focusCoords, map]);

    return null;
}

export default function TripsMap({ selectedTrip, focusCoords }) {
    // Default center (Casablanca)
    const defaultCenter = [33.5731, -7.5898];

    // Construct path from points
    const getPath = () => {
        if (!selectedTrip?.routeId) return [];
        const route = selectedTrip.routeId;
        const points = [];

        if (route.startPoint?.coordinates) points.push([route.startPoint.coordinates[1], route.startPoint.coordinates[0]]);

        // Add waypoints if any (simplified)
        if (route.waypoints && route.waypoints.length > 0) {
            route.waypoints.forEach(wp => {
                if (wp.coordinates) points.push([wp.coordinates[1], wp.coordinates[0]]);
            });
        }

        if (route.endPoint?.coordinates) points.push([route.endPoint.coordinates[1], route.endPoint.coordinates[0]]);

        return points;
    };

    const pathPositions = getPath();

    return (
        <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-lg border border-slate-700/50 mb-6 bg-slate-900 relative">
            {/* ... overlay code ... */}
            <MapContainer
                center={defaultCenter}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <FocusHandler focusCoords={focusCoords} />

                {selectedTrip && (
                    <>
                        <MapUpdater selectedTrip={selectedTrip} />

                        {/* Start Marker */}
                        {selectedTrip.routeId?.startPoint?.coordinates && (
                            <Marker position={[selectedTrip.routeId.startPoint.coordinates[1], selectedTrip.routeId.startPoint.coordinates[0]]}>
                                <Popup>
                                    <div className="text-sm">
                                        <strong>Start Point</strong><br />
                                        {selectedTrip.routeId.startPoint.address}
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* End Marker */}
                        {selectedTrip.routeId?.endPoint?.coordinates && (
                            <Marker position={[selectedTrip.routeId.endPoint.coordinates[1], selectedTrip.routeId.endPoint.coordinates[0]]}>
                                <Popup>
                                    <div className="text-sm">
                                        <strong>End Point</strong><br />
                                        {selectedTrip.routeId.endPoint.address}
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* Route Line */}
                        {pathPositions.length > 1 && (
                            <Polyline
                                positions={pathPositions}
                                pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '10, 10' }}
                            />
                        )}
                    </>
                )}
            </MapContainer>
        </div>
    );
}

// Helper icons

