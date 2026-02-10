import { Car, MapPin, Navigation, Star, Trash2, User } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import { LatLng, Trip } from '../store/useTripStore';
import { getRegionForCoordinates } from '../utils/location';
import { getAllPointsFromTrip, optimizeRoute, RoutePoint } from '../utils/mapUtils';

interface StopItem {
    id: string;
    latitude: number;
    longitude: number;
}

export interface MapProps {
    mode?: 'picker' | 'trip' | 'route' | 'view';
    theme: any;
    height?: number | string;
    readOnly?: boolean;
    style?: ViewStyle;

    // Picker Props
    initialPoints?: LatLng[];
    onPointsChange?: (points: LatLng[]) => void;

    // Trip Props
    trip?: Trip;
    customStopOrder?: StopItem[];

    // Route Props
    startPoint?: LatLng;
    endPoint?: LatLng;
    waypoints?: LatLng[];

    // General
    driverLocation?: { latitude: number; longitude: number; heading: number };
}

export default function Map({
    mode = 'view',
    theme,
    height = 300,
    readOnly = false,
    style,
    initialPoints = [],
    onPointsChange,
    trip,
    customStopOrder,
    startPoint,
    endPoint,
    waypoints = [],
    driverLocation
}: MapProps) {
    // Web fallback is handled by Map.web.tsx, so this is purely Native code.
    // However, if this file is imported on web by mistake, we should handle it or it will crash if react-native-maps doesn't support web well (it doesn't).
    // The .web.tsx extension handles the platform split.

    const mapRef = useRef<MapView>(null);
    const { location } = useLocationStore();
    const { user } = useAuthStore();

    // -- generic state --
    const [points, setPoints] = useState<LatLng[]>(initialPoints);

    // -- trip state --
    const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
    const [intermediatePoints, setIntermediatePoints] = useState<RoutePoint[]>([]);

    // Initialize points for Picker Picker
    useEffect(() => {
        if (mode === 'picker' && initialPoints.length > 0) {
            setPoints(initialPoints);
        }
    }, [initialPoints, mode]);

    // Calculate Trip Route
    useEffect(() => {
        if (mode === 'trip' && trip) {
            const driverRoute = trip.routeId;
            const clients = trip.clients || [];

            // Allow override if customStopOrder is passed? 
            // The optimizeRoute utility currently doesn't accept customStopOrder directly as a list of points to force.
            // But we can construct the route manually if exists.

            if (customStopOrder && customStopOrder.length > 0) {
                const coords = customStopOrder.map(s => ({
                    latitude: s.latitude,
                    longitude: s.longitude
                }));
                // We might want to include start/end if they are not in custom order?
                // For now assuming customStopOrder is the full sequence or user preference
                setRouteCoordinates(coords);
            } else {
                const { sortedPoints, routeCoordinates: computedRoute } = optimizeRoute(
                    driverRoute?.startPoint,
                    driverRoute?.endPoint,
                    driverRoute?.waypoints,
                    clients
                );
                setIntermediatePoints(sortedPoints);
                setRouteCoordinates(computedRoute);
            }
        }
    }, [trip, customStopOrder, mode]);

    // Calculate generic Route
    useEffect(() => {
        if (mode === 'route' && startPoint && endPoint) {
            // Simple start -> waypoints -> end
            const coords: LatLng[] = [startPoint, ...waypoints, endPoint];
            setRouteCoordinates(coords);
        }
    }, [startPoint, endPoint, waypoints, mode]);

    // Fit to coordinates
    useEffect(() => {
        if (mapRef.current) {
            let pointsToFit: LatLng[] = [];

            if (mode === 'picker') {
                pointsToFit = points;
            } else if (mode === 'trip' && trip) {
                pointsToFit = getAllPointsFromTrip(trip);
                if (driverLocation) pointsToFit.push(driverLocation);
            } else if (mode === 'route') {
                if (startPoint) pointsToFit.push(startPoint);
                if (endPoint) pointsToFit.push(endPoint);
                pointsToFit = [...pointsToFit, ...waypoints];
            }

            if (pointsToFit.length > 0) {
                mapRef.current.fitToCoordinates(pointsToFit, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }
        }
    }, [points, trip, startPoint, endPoint, waypoints, mode, driverLocation]);

    // --- Interaction Handlers (Picker Mode) ---

    const handlePress = (e: any) => {
        if (mode !== 'picker' || readOnly) return;
        const newPoint = e.nativeEvent.coordinate;
        const newPoints = [...points, newPoint];
        setPoints(newPoints);
        onPointsChange && onPointsChange(newPoints);
    };

    const clearPoints = () => {
        setPoints([]);
        onPointsChange && onPointsChange([]);
    };

    const centerToMyLocation = () => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    // --- Render Helpers ---

    const renderPickerMarkers = () => {
        return (
            <>
                {user?.savedPlaces?.map((place, index) => (
                    <Marker
                        key={`saved-${index}`}
                        coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        onPress={(e) => {
                            if (readOnly) return;
                            const newPoint = e.nativeEvent.coordinate;
                            setPoints([...points, newPoint]);
                            onPointsChange && onPointsChange([...points, newPoint]);
                        }}
                    >
                        <View style={[styles.savedPlaceMarker, { backgroundColor: theme.surface }]}>
                            <Star size={16} color="#FFD700" fill="#FFD700" />
                        </View>
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={[styles.calloutText, { color: theme.text }]}>{place.label}</Text>
                                <Text style={{ fontSize: 10, color: theme.icon }}>Tap to add to route</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}

                {points.map((point, index) => (
                    <Marker
                        key={index}
                        coordinate={point}
                        pinColor={index === 0 ? 'green' : index === points.length - 1 ? 'red' : 'blue'}
                        draggable={!readOnly}
                        onDragEnd={(e) => {
                            if (readOnly) return;
                            const newPoints = [...points];
                            newPoints[index] = e.nativeEvent.coordinate;
                            setPoints(newPoints);
                            onPointsChange && onPointsChange(newPoints);
                        }}
                    >
                        <View style={[styles.markerBadge, { backgroundColor: index === 0 ? '#4CD964' : index === points.length - 1 ? '#FF3B30' : '#007AFF' }]}>
                            <Text style={styles.markerText}>{index + 1}</Text>
                        </View>
                        <Callout onPress={() => {
                            if (readOnly) return;
                            const newPoints = points.filter((_, i) => i !== index);
                            setPoints(newPoints);
                            onPointsChange && onPointsChange(newPoints);
                        }}>
                            <View style={styles.callout}>
                                <Text style={[styles.calloutText, { color: '#ff4444' }]}>Delete Point</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </>
        );
    };

    const renderTripMarkers = () => {
        if (!trip || !trip.routeId) return null;
        const driverRoute = trip.routeId;
        const clients = trip.clients || [];

        return (
            <>
                {/* Driver Start */}
                {driverRoute.startPoint && (
                    <Marker coordinate={driverRoute.startPoint} pinColor="green">
                        <View style={[styles.markerBadge, { backgroundColor: '#10b981' }]}>
                            <Car size={14} color="#fff" />
                        </View>
                    </Marker>
                )}

                {/* Driver End */}
                {driverRoute.endPoint && (
                    <Marker coordinate={driverRoute.endPoint} pinColor="red">
                        <View style={[styles.markerBadge, { backgroundColor: '#ef4444' }]}>
                            <MapPin size={14} color="#fff" />
                        </View>
                    </Marker>
                )}

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
                    <React.Fragment key={`client-${index}`}>
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
            </>
        );
    };

    const renderRouteMarkers = () => {
        return (
            <>
                {startPoint && (
                    <Marker coordinate={startPoint}>
                        <View style={[styles.markerBadge, { backgroundColor: '#10b981' }]}>
                            <Navigation size={14} color="#fff" />
                        </View>
                    </Marker>
                )}
                {endPoint && (
                    <Marker coordinate={endPoint}>
                        <View style={[styles.markerBadge, { backgroundColor: '#ef4444' }]}>
                            <MapPin size={14} color="#fff" />
                        </View>
                    </Marker>
                )}
                {waypoints.map((wp, index) => (
                    <Marker key={index} coordinate={wp}>
                        <View style={[styles.waypointMarker, { backgroundColor: '#f59e0b' }]}>
                            <Text style={styles.waypointText}>{index + 1}</Text>
                        </View>
                    </Marker>
                ))}
            </>
        );
    };

    const initialRegion = getRegionForCoordinates(mode === 'picker' ? points : []) || {
        latitude: 33.5731,
        longitude: -7.5898,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    return (
        <View style={[styles.container, style, { height, backgroundColor: '#e5e3df', borderRadius: 20, overflow: 'hidden' }]}>
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={initialRegion}
                onPress={handlePress}
                showsUserLocation={mode === 'picker'} // Only show in picker mode usually, or generic view
            >
                {mode === 'picker' && renderPickerMarkers()}
                {mode === 'trip' && renderTripMarkers()}
                {mode === 'route' && renderRouteMarkers()}

                {/* Driver Location */}
                {driverLocation && (
                    <Marker
                        coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        rotation={driverLocation.heading}
                    >
                        <View style={[styles.carMarker, { backgroundColor: theme.primary }]}>
                            <Car size={20} color="#fff" />
                        </View>
                    </Marker>
                )}

                {/* Polylines */}
                {(mode === 'picker' && points.length > 1) && (
                    <Polyline
                        coordinates={points}
                        strokeColor={theme.primary}
                        strokeWidth={3}
                    />
                )}
                {(mode === 'trip' && routeCoordinates.length > 1) && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={theme.primary}
                        strokeWidth={4}
                    />
                )}
                {(mode === 'route' && routeCoordinates.length > 1) && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={theme.primary}
                        strokeWidth={4}
                    />
                )}

            </MapView>

            {/* Controls for Picker Mode */}
            {mode === 'picker' && !readOnly && (
                <View style={styles.controls}>
                    <View style={styles.leftControls}>
                        {points.length > 0 && (
                            <TouchableOpacity
                                style={[styles.controlButton, { backgroundColor: theme.accent }]}
                                onPress={clearPoints}
                            >
                                <Trash2 size={20} color="#fff" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.controlButton, { backgroundColor: theme.primary }]}
                            onPress={centerToMyLocation}
                        >
                            <Navigation size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Text style={[styles.infoText, { color: theme.text }]}>
                            {points.length === 0 ? 'Tap to set Start Point' :
                                points.length === 1 ? 'Tap to set End Point' :
                                    `Route with ${points.length} points`}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: '#ccc',
    },
    markerBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 4,
        // @ts-ignore
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
    },
    markerText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    carMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 4,
        // @ts-ignore
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
    },
    savedPlaceMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFD700',
        elevation: 4,
        // @ts-ignore
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
    },
    callout: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    calloutText: {
        fontWeight: '700',
    },
    controls: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftControls: {
        flexDirection: 'row',
        gap: 8,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        // @ts-ignore
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
    },
    infoBox: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 22,
        borderWidth: 1,
        elevation: 4,
        // @ts-ignore
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
    },
    infoText: {
        fontWeight: '700',
        fontSize: 12,
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
