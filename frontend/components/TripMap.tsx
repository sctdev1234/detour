import { Car, MapPin, User } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { LatLng, Trip } from '../store/useTripStore';
import { getRegionForCoordinates } from '../utils/location';

export interface StopItem {
    id: string;
    type: 'driver_start' | 'pickup' | 'waypoint' | 'dropoff' | 'driver_end';
    latitude: number;
    longitude: number;
    address?: string;
    clientName?: string;
    clientIndex?: number;
    isFixed?: boolean;
}

interface TripMapProps {
    trip: Trip;
    theme: any;
    customStopOrder?: StopItem[] | null;
}

export default function TripMap({ trip, theme, customStopOrder }: TripMapProps) {
    const mapRef = useRef<MapView>(null);
    const [LeafletMap, setLeafletMap] = useState<React.ComponentType<any> | null>(null);
    const [isLoading, setIsLoading] = useState(Platform.OS === 'web');

    // Dynamic import Leaflet version for web
    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            import('./TripMapLeaflet')
                .then((module) => {
                    setLeafletMap(() => module.default);
                    setIsLoading(false);
                })
                .catch((err) => {
                    console.error('Failed to load TripMapLeaflet:', err);
                    setIsLoading(false);
                });
        }
    }, []);

    // For Web - use Leaflet
    if (Platform.OS === 'web') {
        if (isLoading || !LeafletMap) {
            return (
                <View style={[styles.container, styles.loadingContainer]}>
                    <Text style={[styles.loadingText, { color: theme.icon }]}>Loading map...</Text>
                </View>
            );
        }
        return <LeafletMap trip={trip} theme={theme} customStopOrder={customStopOrder} />;
    }

    // For Native - use react-native-maps
    const driverRoute = trip.routeId;
    const clients = trip.clients || [];

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

    // Collect all intermediate points with type info
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
    driverRoute?.waypoints?.forEach((wp: LatLng) => {
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
    let currentLat = driverRoute?.startPoint?.latitude || 0;
    let currentLon = driverRoute?.startPoint?.longitude || 0;
    const pickedUp = new Set<number>();

    while (remaining.length > 0) {
        let nearestIdx = -1;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const point = remaining[i];
            if (point.type === 'dropoff' && point.clientIndex !== undefined && !pickedUp.has(point.clientIndex)) {
                continue;
            }
            const dist = getDistance(currentLat, currentLon, point.lat, point.lon);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        if (nearestIdx === -1) break;

        const nextPoint = remaining.splice(nearestIdx, 1)[0];
        sortedPoints.push(nextPoint);

        if (nextPoint.type === 'pickup' && nextPoint.clientIndex !== undefined) {
            pickedUp.add(nextPoint.clientIndex);
        }

        currentLat = nextPoint.lat;
        currentLon = nextPoint.lon;
    }

    // Build route coordinates - use custom order if provided, otherwise use sorted points
    const routeCoordinates: LatLng[] = [];

    if (customStopOrder && customStopOrder.length > 0) {
        // Use custom order provided by driver
        customStopOrder.forEach(stop => {
            routeCoordinates.push({ latitude: stop.latitude, longitude: stop.longitude } as LatLng);
        });
    } else {
        // Use optimized route
        if (driverRoute?.startPoint?.latitude) {
            routeCoordinates.push(driverRoute.startPoint);
        }
        sortedPoints.forEach(point => {
            routeCoordinates.push({ latitude: point.lat, longitude: point.lon } as LatLng);
        });
        if (driverRoute?.endPoint?.latitude) {
            routeCoordinates.push(driverRoute.endPoint);
        }
    }

    // Extract all relevant points to fit camera
    const allPoints: LatLng[] = [];
    if (driverRoute?.startPoint?.latitude) allPoints.push(driverRoute.startPoint);
    if (driverRoute?.endPoint?.latitude) allPoints.push(driverRoute.endPoint);
    clients.forEach(c => {
        if (c.routeId?.startPoint?.latitude) allPoints.push(c.routeId.startPoint);
        if (c.routeId?.endPoint?.latitude) allPoints.push(c.routeId.endPoint);
    });

    const initialRegion = getRegionForCoordinates(allPoints) || {
        latitude: driverRoute?.startPoint?.latitude || 33.5731,
        longitude: driverRoute?.startPoint?.longitude || -7.5898,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    useEffect(() => {
        if (Platform.OS !== 'web' && mapRef.current && allPoints.length > 0) {
            mapRef.current.fitToCoordinates(allPoints, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }, [trip]);

    if (!driverRoute) return <View style={styles.container}><Text>Loading Route...</Text></View>;

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion}
            >
                {/* Optimized Route Line */}
                <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={theme.primary}
                    strokeWidth={4}
                />

                {/* Driver Start */}
                <Marker coordinate={driverRoute.startPoint} pinColor="green">
                    <View style={[styles.markerBadge, { backgroundColor: '#10b981' }]}>
                        <Car size={14} color="#fff" />
                    </View>
                </Marker>

                {/* Driver End */}
                <Marker coordinate={driverRoute.endPoint} pinColor="red">
                    <View style={[styles.markerBadge, { backgroundColor: '#ef4444' }]}>
                        <MapPin size={14} color="#fff" />
                    </View>
                </Marker>

                {/* Driver Waypoints */}
                {driverRoute.waypoints?.map((waypoint: LatLng, index: number) => (
                    waypoint?.latitude && (
                        <Marker key={`waypoint-${index}`} coordinate={waypoint}>
                            <View style={[styles.waypointMarker, { backgroundColor: theme.primary }]}>
                                <Text style={styles.waypointText}>{index + 1}</Text>
                            </View>
                        </Marker>
                    )
                ))}

                {/* Clients */}
                {clients.map((client: any, index: number) => (
                    <React.Fragment key={index}>
                        {/* Client Pickup */}
                        {client.routeId?.startPoint && (
                            <Marker coordinate={client.routeId.startPoint}>
                                {client.userId?.photoURL ? (
                                    <View style={[styles.profileMarker, { borderColor: '#10b981' }]}>
                                        <Image source={{ uri: client.userId.photoURL }} style={styles.profileImage} />
                                    </View>
                                ) : (
                                    <View style={[styles.clientMarker, { backgroundColor: theme.secondary }]}>
                                        <User size={12} color="#fff" />
                                    </View>
                                )}
                            </Marker>
                        )}
                        {/* Client Dropoff */}
                        {client.routeId?.endPoint && (
                            <Marker coordinate={client.routeId.endPoint}>
                                {client.userId?.photoURL ? (
                                    <View style={[styles.profileMarker, { borderColor: '#ef4444' }]}>
                                        <Image source={{ uri: client.userId.photoURL }} style={styles.profileImage} />
                                    </View>
                                ) : (
                                    <View style={[styles.clientMarker, { backgroundColor: theme.secondary, opacity: 0.7 }]}>
                                        <MapPin size={12} color="#fff" />
                                    </View>
                                )}
                            </Marker>
                        )}
                    </React.Fragment>
                ))}
            </MapView>
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
    loadingText: {
        fontSize: 14,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 4,
    },
    clientMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 3,
    },
    waypointMarker: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 3,
    },
    waypointText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    profileMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        overflow: 'hidden',
        elevation: 4,
    },
    profileImage: {
        width: '100%',
        height: '100%',
    }
});
