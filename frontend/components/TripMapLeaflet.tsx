import L from 'leaflet';
import { Car, MapPin, User } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';
import { LatLng, Trip } from '../store/useTripStore';

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

interface StopItem {
    id: string;
    type: 'driver_start' | 'pickup' | 'waypoint' | 'dropoff' | 'driver_end';
    latitude: number;
    longitude: number;
    address?: string;
    clientName?: string;
    clientIndex?: number;
    isFixed?: boolean;
}

interface TripMapLeafletProps {
    trip: Trip;
    theme: any;
    customStopOrder?: StopItem[] | null;
}

// Helper to fit bounds
const MapBoundsUpdater = ({ points }: { points: LatLng[] }) => {
    const map = useMap();

    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [points, map]);

    return null;
};

export default function TripMapLeaflet({ trip, theme, customStopOrder }: TripMapLeafletProps) {
    const driverRoute = trip.routeId;
    const clients = trip.clients || [];

    // Extract all relevant points to fit camera
    const allPoints: LatLng[] = [];
    if (driverRoute?.startPoint?.latitude) allPoints.push(driverRoute.startPoint);
    if (driverRoute?.endPoint?.latitude) allPoints.push(driverRoute.endPoint);
    driverRoute?.waypoints?.forEach((wp: LatLng) => {
        if (wp?.latitude) allPoints.push(wp);
    });
    clients.forEach((c: any) => {
        if (c.routeId?.startPoint?.latitude) allPoints.push(c.routeId.startPoint);
        if (c.routeId?.endPoint?.latitude) allPoints.push(c.routeId.endPoint);
    });

    if (!driverRoute || allPoints.length === 0) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <View style={{ padding: 20 }}>
                    <span style={{ color: theme.icon }}>Loading map...</span>
                </View>
            </View>
        );
    }

    // Default center
    const center: [number, number] = [
        driverRoute.startPoint?.latitude || 33.5731,
        driverRoute.startPoint?.longitude || -7.5898
    ];

    // Helper function to calculate distance between two points (Haversine formula)
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Collect all intermediate points (pickups, waypoints, dropoffs) with type info
    interface RoutePoint {
        lat: number;
        lon: number;
        type: 'pickup' | 'waypoint' | 'dropoff';
        clientIndex?: number;
    }

    const intermediatePoints: RoutePoint[] = [];

    // Add client pickups
    clients.forEach((client: any, idx: number) => {
        if (client.routeId?.startPoint?.latitude) {
            intermediatePoints.push({
                lat: client.routeId.startPoint.latitude,
                lon: client.routeId.startPoint.longitude,
                type: 'pickup',
                clientIndex: idx
            });
        }
    });

    // Add driver waypoints
    driverRoute.waypoints?.forEach((wp: LatLng) => {
        if (wp?.latitude) {
            intermediatePoints.push({
                lat: wp.latitude,
                lon: wp.longitude,
                type: 'waypoint'
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
                clientIndex: idx
            });
        }
    });

    // Sort intermediate points using nearest neighbor algorithm for shortest path
    const sortedPoints: RoutePoint[] = [];
    const remaining = [...intermediatePoints];
    let currentLat = driverRoute.startPoint?.latitude || 0;
    let currentLon = driverRoute.startPoint?.longitude || 0;

    // Track which clients have been picked up (dropoff can only happen after pickup)
    const pickedUp = new Set<number>();

    while (remaining.length > 0) {
        // Find nearest point that can be visited (pickups first for each client)
        let nearestIdx = -1;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const point = remaining[i];

            // Skip dropoffs if client hasn't been picked up yet
            if (point.type === 'dropoff' && point.clientIndex !== undefined && !pickedUp.has(point.clientIndex)) {
                continue;
            }

            const dist = getDistance(currentLat, currentLon, point.lat, point.lon);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        if (nearestIdx === -1) break; // Safety check

        const nextPoint = remaining.splice(nearestIdx, 1)[0];
        sortedPoints.push(nextPoint);

        // Mark client as picked up
        if (nextPoint.type === 'pickup' && nextPoint.clientIndex !== undefined) {
            pickedUp.add(nextPoint.clientIndex);
        }

        currentLat = nextPoint.lat;
        currentLon = nextPoint.lon;
    }

    // Build route coordinates - use custom order if provided, otherwise use sorted points
    const routeCoordinates: [number, number][] = [];

    if (customStopOrder && customStopOrder.length > 0) {
        // Use custom order provided by driver
        customStopOrder.forEach(stop => {
            routeCoordinates.push([stop.latitude, stop.longitude]);
        });
    } else {
        // Use optimized route
        // 1. Driver Start
        if (driverRoute.startPoint?.latitude) {
            routeCoordinates.push([driverRoute.startPoint.latitude, driverRoute.startPoint.longitude]);
        }

        // 2. Sorted intermediate points (pickups, waypoints, dropoffs in optimal order)
        sortedPoints.forEach(point => {
            routeCoordinates.push([point.lat, point.lon]);
        });

        // 3. Driver End
        if (driverRoute.endPoint?.latitude) {
            routeCoordinates.push([driverRoute.endPoint.latitude, driverRoute.endPoint.longitude]);
        }
    }

    // Create custom icons
    const createDriverStartIcon = () => {
        const iconMarkup = renderToStaticMarkup(<Car size={14} color="#fff" />);
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

    const createDriverEndIcon = () => {
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

    const createClientPickupIcon = (photoURL?: string) => {
        const iconMarkup = renderToStaticMarkup(<User size={12} color="#fff" />);
        const html = photoURL ? `
        <div style="
            width: 32px;
            height: 32px;
            border-radius: 16px;
            border: 3px solid #10b981;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            overflow: hidden;
            background-color: ${theme.secondary || '#6366f1'};
        ">
            <img src="${photoURL}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'"/>
        </div>` : `
        <div style="
            background-color: ${theme.secondary || '#6366f1'};
            width: 24px;
            height: 24px;
            border-radius: 12px;
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
            iconSize: photoURL ? [32, 32] : [24, 24],
            iconAnchor: photoURL ? [16, 16] : [12, 12],
        });
    };

    const createClientDropoffIcon = (photoURL?: string) => {
        const iconMarkup = renderToStaticMarkup(<MapPin size={12} color="#fff" />);
        const html = photoURL ? `
        <div style="
            width: 32px;
            height: 32px;
            border-radius: 16px;
            border: 3px solid #ef4444;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            overflow: hidden;
            background-color: ${theme.secondary || '#6366f1'};
        ">
            <img src="${photoURL}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'"/>
        </div>` : `
        <div style="
            background-color: ${theme.secondary || '#6366f1'};
            opacity: 0.7;
            width: 24px;
            height: 24px;
            border-radius: 12px;
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
            iconSize: photoURL ? [32, 32] : [24, 24],
            iconAnchor: photoURL ? [16, 16] : [12, 12],
        });
    };

    return (
        <View style={styles.container}>
            <LeafletStyles />
            <div style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <MapContainer
                    center={center}
                    zoom={13}
                    style={{ height: '100%', width: '100%', borderRadius: 20 }}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    dragging={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapBoundsUpdater points={allPoints} />

                    {/* Driver Route Line */}
                    {routeCoordinates.length > 1 && (
                        <Polyline
                            positions={routeCoordinates}
                            pathOptions={{ color: theme.primary || '#007AFF', weight: 4, opacity: 0.8 }}
                        />
                    )}

                    {/* Driver Start Marker */}
                    {driverRoute.startPoint?.latitude && (
                        <Marker
                            position={[driverRoute.startPoint.latitude, driverRoute.startPoint.longitude]}
                            icon={createDriverStartIcon()}
                        >
                            <Popup>
                                <div style={{ minWidth: 150 }}>
                                    <strong style={{ color: '#10b981' }}>🚗 Departure</strong>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                                        {driverRoute.startPoint.address || 'Starting point'}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Driver End Marker */}
                    {driverRoute.endPoint?.latitude && (
                        <Marker
                            position={[driverRoute.endPoint.latitude, driverRoute.endPoint.longitude]}
                            icon={createDriverEndIcon()}
                        >
                            <Popup>
                                <div style={{ minWidth: 150 }}>
                                    <strong style={{ color: '#ef4444' }}>📍 Destination</strong>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                                        {driverRoute.endPoint.address || 'End point'}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Driver Waypoint Markers */}
                    {driverRoute.waypoints?.map((waypoint: LatLng, index: number) => (
                        waypoint?.latitude && (
                            <Marker
                                key={`waypoint-${index}`}
                                position={[waypoint.latitude, waypoint.longitude]}
                                icon={(() => {
                                    const html = `
                                    <div style="
                                        background-color: ${theme.primary || '#007AFF'};
                                        width: 22px;
                                        height: 22px;
                                        border-radius: 11px;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        border: 2px solid white;
                                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                                        font-size: 10px;
                                        font-weight: bold;
                                        color: white;
                                    ">
                                        ${index + 1}
                                    </div>`;
                                    return L.divIcon({
                                        html: html,
                                        className: '',
                                        iconSize: [22, 22],
                                        iconAnchor: [11, 11],
                                    });
                                })()}
                            >
                                <Popup>
                                    <div style={{ minWidth: 150 }}>
                                        <strong style={{ color: theme.primary || '#007AFF' }}>📌 Waypoint {index + 1}</strong>
                                        <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                                            {waypoint.address || 'Intermediate stop'}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}

                    {/* Client Markers */}
                    {clients.map((client: any, index: number) => (
                        <React.Fragment key={index}>
                            {/* Client Pickup */}
                            {client.routeId?.startPoint?.latitude && (
                                <Marker
                                    position={[client.routeId.startPoint.latitude, client.routeId.startPoint.longitude]}
                                    icon={createClientPickupIcon(client.userId?.photoURL)}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 180 }}>
                                            <strong style={{ color: '#10b981' }}>⬆️ Pick up</strong>
                                            <p style={{ margin: '8px 0 4px 0', fontSize: '14px', fontWeight: 600 }}>
                                                {client.userId?.name || client.userId?.firstName || `Passenger ${index + 1}`}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                                                {client.routeId.startPoint.address || 'Pickup location'}
                                            </p>
                                            {client.userId?.phone && (
                                                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                                                    📞 {client.userId.phone}
                                                </p>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                            {/* Client Dropoff */}
                            {client.routeId?.endPoint?.latitude && (
                                <Marker
                                    position={[client.routeId.endPoint.latitude, client.routeId.endPoint.longitude]}
                                    icon={createClientDropoffIcon(client.userId?.photoURL)}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 180 }}>
                                            <strong style={{ color: '#ef4444' }}>⬇️ Drop off</strong>
                                            <p style={{ margin: '8px 0 4px 0', fontSize: '14px', fontWeight: 600 }}>
                                                {client.userId?.name || client.userId?.firstName || `Passenger ${index + 1}`}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                                                {client.routeId.endPoint.address || 'Dropoff location'}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                        </React.Fragment>
                    ))}
                </MapContainer>
            </div>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 300,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        marginTop: 16,
        backgroundColor: '#e5e3df',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
