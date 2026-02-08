import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';
import { LatLng } from '../store/useTripStore';

// Inject Leaflet CSS
const LeafletStyles = () => {
    useEffect(() => {
        const styleId = 'leaflet-css';
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
    }, []);
    return null;
};

interface RouteMapViewLeafletProps {
    startPoint: LatLng;
    endPoint: LatLng;
    waypoints?: LatLng[];
    theme: any;
    height?: number;
}

// Helper to fit bounds
const MapBoundsUpdater = ({ points }: { points: LatLng[] }) => {
    const map = useMap();

    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [points, map]);

    return null;
};

export default function RouteMapViewLeaflet({ startPoint, endPoint, waypoints = [], theme, height = 200 }: RouteMapViewLeafletProps) {
    // Collect all points
    const allPoints: LatLng[] = [];
    if (startPoint?.latitude) allPoints.push(startPoint);
    waypoints?.forEach(wp => {
        if (wp?.latitude) allPoints.push(wp);
    });
    if (endPoint?.latitude) allPoints.push(endPoint);

    if (allPoints.length === 0) {
        return null;
    }

    // Default center
    const center: [number, number] = [
        startPoint?.latitude || 33.5731,
        startPoint?.longitude || -7.5898
    ];

    // Create custom icons
    const createStartIcon = () => {
        const iconMarkup = renderToStaticMarkup(<Navigation size={14} color="#fff" />);
        const html = `
        <div style="
            background-color: #10b981;
            width: 28px;
            height: 28px;
            border-radius: 14px;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
            ${iconMarkup}
        </div>`;
        return L.divIcon({
            html: html,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });
    };

    const createEndIcon = () => {
        const iconMarkup = renderToStaticMarkup(<MapPin size={14} color="#fff" />);
        const html = `
        <div style="
            background-color: #ef4444;
            width: 28px;
            height: 28px;
            border-radius: 14px;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
            ${iconMarkup}
        </div>`;
        return L.divIcon({
            html: html,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });
    };

    const createWaypointIcon = (index: number) => {
        const html = `
        <div style="
            background-color: #f59e0b;
            width: 24px;
            height: 24px;
            border-radius: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
            <span style="color: white; font-size: 10px; font-weight: bold; font-family: sans-serif;">${index + 1}</span>
        </div>`;
        return L.divIcon({
            html: html,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });
    };

    return (
        <View style={[styles.container, { height }]}>
            <LeafletStyles />
            <div style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <MapContainer
                    center={center}
                    zoom={13}
                    style={{ height: '100%', width: '100%', borderRadius: 16 }}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    dragging={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapBoundsUpdater points={allPoints} />

                    {/* Polyline connecting all points */}
                    {allPoints.length > 1 && (
                        <Polyline
                            positions={allPoints.map(p => [p.latitude, p.longitude])}
                            pathOptions={{ color: theme.primary || '#007AFF', weight: 4, opacity: 0.8 }}
                        />
                    )}

                    {/* Start Point Marker */}
                    {startPoint?.latitude && (
                        <Marker
                            position={[startPoint.latitude, startPoint.longitude]}
                            icon={createStartIcon()}
                        />
                    )}

                    {/* Waypoint Markers */}
                    {waypoints?.map((waypoint, index) => (
                        waypoint?.latitude && (
                            <Marker
                                key={`waypoint-${index}`}
                                position={[waypoint.latitude, waypoint.longitude]}
                                icon={createWaypointIcon(index)}
                            />
                        )
                    ))}

                    {/* End Point Marker */}
                    {endPoint?.latitude && (
                        <Marker
                            position={[endPoint.latitude, endPoint.longitude]}
                            icon={createEndIcon()}
                        />
                    )}
                </MapContainer>
            </div>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#e5e3df',
    },
});
