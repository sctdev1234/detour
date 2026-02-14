
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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

export default function TripsMap({ selectedTrip, focusCoords, isFullScreen, onToggleFullScreen }) {
    // Default center (Casablanca)
    const defaultCenter = [33.5731, -7.5898];
    const [mapStyle, setMapStyle] = useState('dark');
    const [showStyleMenu, setShowStyleMenu] = useState(false);

    const mapStyles = {
        dark: {
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            label: "Dark Mode"
        },
        light: {
            url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            label: "Light Mode"
        },
        street: {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            label: "Street View"
        },
        satellite: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            label: "Satellite"
        }
    };

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
        <div className={`w-full rounded-2xl overflow-hidden shadow-lg border border-slate-700/50 bg-slate-900 relative transition-all duration-500 ${isFullScreen ? 'h-full rounded-none border-0' : 'h-[400px] mb-6'}`}>

            {/* Map Style Switcher */}
            <div className="absolute top-4 right-16 z-[400]">
                <button
                    onClick={() => setShowStyleMenu(!showStyleMenu)}
                    className={`p-3 rounded-xl backdrop-blur-md border transition-all duration-300 shadow-2xl group ${showStyleMenu ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'}`}
                    title="Change Map Style"
                >
                    <Layers className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                <div className={`absolute top-full right-0 mt-2 w-40 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 origin-top-right ${showStyleMenu ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
                    <div className="p-1 space-y-1">
                        {Object.entries(mapStyles).map(([key, style]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setMapStyle(key);
                                    setShowStyleMenu(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${mapStyle === key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${mapStyle === key ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toggle Full Screen Button */}
            <button
                onClick={onToggleFullScreen}
                className="absolute top-4 right-4 z-[400] p-3 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all duration-300 shadow-2xl group"
                title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
            >
                {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            {/* ... overlay code ... */}
            <MapContainer
                center={defaultCenter}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    url={mapStyles[mapStyle].url}
                    attribution={mapStyles[mapStyle].attribution}
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

