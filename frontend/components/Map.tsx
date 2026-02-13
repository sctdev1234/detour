import * as Location from 'expo-location';
import { Briefcase, Car, Dumbbell, GraduationCap, Home, MapPin, Navigation, Trash2, User } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { LatLng, Trip } from '../types';
import { decodePolyline } from '../utils/location';


interface StopItem {
    id: string;
    latitude: number;
    longitude: number;
}

export interface MapProps {
    mode?: 'picker' | 'trip' | 'route' | 'view';
    theme: any;
    height?: ViewStyle['height'];
    readOnly?: boolean;
    style?: ViewStyle;

    // Picker Props
    initialPoints?: LatLng[];
    onPointsChange?: (points: LatLng[]) => void;
    maxPoints?: number;

    // Trip Props
    trip?: Trip;
    customStopOrder?: StopItem[];

    // Route Props
    startPoint?: LatLng;
    endPoint?: LatLng;
    waypoints?: LatLng[];

    // General
    driverLocation?: { latitude: number; longitude: number; heading: number };
    savedPlaces?: any[]; // Keep flexible or use SavedPlace type if imported
}

// --- Sub-components for Markers to prevent re-renders ---

const PickerMarkers = React.memo(({ points, savedPlaces, theme, readOnly, onPointAdd, onPointRemove, onDragEnd }: any) => {
    return (
        <>
            {savedPlaces?.map((place: any, index: number) => {
                let IconComponent = MapPin;
                switch (place.icon) {
                    case 'home': IconComponent = Home; break;
                    case 'work': case 'briefcase': IconComponent = Briefcase; break;
                    case 'gym': IconComponent = Dumbbell; break;
                    case 'school': case 'graduation-cap': IconComponent = GraduationCap; break;
                }

                return (
                    <Marker
                        key={`saved-${place._id || index}`}
                        coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        onPress={(e) => onPointAdd(e.nativeEvent.coordinate)}
                    >
                        <View style={[styles.savedPlaceMarker, { backgroundColor: theme.primary, borderColor: '#fff' }]}>
                            <IconComponent size={16} color="#fff" />
                        </View>
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={[styles.calloutText, { color: theme.text }]}>{place.label}</Text>
                                {!readOnly && <Text style={{ fontSize: 10, color: theme.icon }}>Tap to add to route</Text>}
                            </View>
                        </Callout>
                    </Marker>
                );
            })}

            {points.map((point: any, index: number) => (
                <Marker
                    key={index}
                    coordinate={point}
                    pinColor={index === 0 ? 'green' : index === points.length - 1 ? 'red' : 'blue'}
                    draggable={!readOnly}
                    onDragEnd={(e) => onDragEnd(index, e.nativeEvent.coordinate)}
                >
                    <View style={[styles.markerBadge, { backgroundColor: index === 0 ? '#4CD964' : index === points.length - 1 ? '#FF3B30' : '#007AFF' }]}>
                        <Text style={styles.markerText}>{index + 1}</Text>
                    </View>
                    <Callout onPress={() => onPointRemove(index)}>
                        <View style={styles.callout}>
                            <Text style={[styles.calloutText, { color: '#ff4444' }]}>Delete Point</Text>
                        </View>
                    </Callout>
                </Marker>
            ))}
        </>
    );
});

const TripMarkers = React.memo(({ trip, theme }: { trip: Trip, theme: any }) => {
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
                        <Callout tooltip>
                            <View style={styles.callout}>
                                <View style={{ gap: 4, minWidth: 120 }}>
                                    <Text style={[styles.calloutTitle, { color: theme.text }]}>Pickup: {client.userId?.fullName || 'Client'}</Text>
                                    {client.userId?.email && <Text style={[styles.calloutSubtitle, { color: theme.icon }]}>{client.userId.email}</Text>}
                                    {client.price && <Text style={[styles.calloutPrice, { color: theme.primary }]}>{client.price} MAD</Text>}
                                    {client.seats && <Text style={[styles.calloutSubtitle, { color: theme.text }]}>{client.seats} seat(s)</Text>}
                                </View>
                            </View>
                        </Callout>
                    </Marker>
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
                        <Callout tooltip>
                            <View style={styles.callout}>
                                <View style={{ gap: 4, minWidth: 120 }}>
                                    <Text style={[styles.calloutTitle, { color: theme.text }]}>Dropoff: {client.userId?.fullName || 'Client'}</Text>
                                    {client.userId?.email && <Text style={[styles.calloutSubtitle, { color: theme.icon }]}>{client.userId.email}</Text>}
                                    {client.price && <Text style={[styles.calloutPrice, { color: theme.primary }]}>{client.price} MAD</Text>}
                                    {client.seats && <Text style={[styles.calloutSubtitle, { color: theme.text }]}>{client.seats} seat(s)</Text>}
                                </View>
                            </View>
                        </Callout>
                    </Marker>
                </React.Fragment>
            ))}
        </>
    );
});

const RouteMarkers = React.memo(({ startPoint, endPoint, waypoints }: any) => {
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
            {waypoints.map((wp: any, index: number) => (
                <Marker key={index} coordinate={wp}>
                    <View style={[styles.waypointMarker, { backgroundColor: '#f59e0b' }]}>
                        <Text style={styles.waypointText}>{index + 1}</Text>
                    </View>
                </Marker>
            ))}
        </>
    );
});

// --- Main Component ---

const Map = React.memo(({
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
    maxPoints,
    savedPlaces = [],
    driverLocation
}: MapProps) => {
    const mapRef = useRef<MapView>(null);
    const [points, setPoints] = useState<LatLng[]>(initialPoints);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);

    // Initial Location Request
    React.useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        })();
    }, []);

    // Sync initial points
    React.useEffect(() => {
        if (initialPoints && initialPoints.length > 0) {
            setPoints(initialPoints);
        }
    }, [initialPoints]);

    // Calculate Route Polyline
    React.useEffect(() => {
        if (trip?.routeId?.routeGeometry) {
            const decoded = decodePolyline(trip.routeId.routeGeometry);
            setRouteCoordinates(decoded);
        } else if (trip?.routeId?.startPoint && trip?.routeId?.endPoint) {
            setRouteCoordinates([
                trip.routeId.startPoint,
                ...(trip.routeId.waypoints || []),
                trip.routeId.endPoint
            ].filter(p => p && p.latitude));
        }
    }, [trip?.routeId?.routeGeometry, trip?.routeId?.startPoint, trip?.routeId?.endPoint, trip?.routeId?.waypoints]);

    // --- Optimized Auto-Center (Fit Bounds) ---
    // NO driverLocation in dependency array to avoid constant zooming
    React.useEffect(() => {
        let markersToFit: LatLng[] = [];

        if (mode === 'picker') {
            if (savedPlaces?.length) {
                const saved = savedPlaces.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
                markersToFit.push(...saved);
            }
            markersToFit.push(...points);
        }

        if (mode === 'route') {
            if (startPoint) markersToFit.push(startPoint);
            if (endPoint) markersToFit.push(endPoint);
            if (waypoints) markersToFit.push(...waypoints);
            if (routeCoordinates.length > 0) markersToFit.push(...routeCoordinates);
        }

        if (mode === 'trip' && trip) {
            // Only include driver location on INITIAL load or if it's the *only* thing
            // But generally we fit to the ROUTE + Clients
            if (trip.routeId?.startPoint) markersToFit.push(trip.routeId.startPoint);
            if (trip.routeId?.endPoint) markersToFit.push(trip.routeId.endPoint);
            if (trip.routeId?.waypoints) markersToFit.push(...trip.routeId.waypoints);

            trip.clients?.forEach((client: any) => {
                if (client.routeId?.startPoint) markersToFit.push(client.routeId.startPoint);
                if (client.routeId?.endPoint) markersToFit.push(client.routeId.endPoint);
            });

            if (routeCoordinates.length > 0) markersToFit.push(...routeCoordinates);
        }

        // Filter invalid points
        // @ts-ignore
        markersToFit = markersToFit.filter(p => p && typeof p.latitude === 'number' && typeof p.longitude === 'number');

        if (markersToFit.length > 0 && mapRef.current) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(markersToFit, {
                    edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                    animated: true,
                });
            }, 100);
        }
    }, [points, savedPlaces, trip?.id, startPoint, endPoint, waypoints, routeCoordinates, mode]);
    // Note: removed driverLocation from dependencies.
    // If we want to initially center on driver, we can checking if it's the FIRST render with driver location.
    // But typically for a Trip view, seeing the whole Route is better.


    // --- Handlers ---

    const handlePress = useCallback((e: any) => {
        if (mode !== 'picker' || readOnly) return;
        const newPoint = e.nativeEvent.coordinate;

        let newPoints = [...points];
        if (maxPoints === 1) {
            newPoints = [newPoint];
        } else if (maxPoints && points.length >= maxPoints) {
            return;
        } else {
            newPoints.push(newPoint);
        }

        setPoints(newPoints);
        onPointsChange && onPointsChange(newPoints);
    }, [mode, readOnly, points, maxPoints, onPointsChange]);

    const handlePointAdd = useCallback((coordinate: LatLng) => {
        if (readOnly) return;
        setPoints(prev => {
            const next = [...prev, coordinate];
            onPointsChange && onPointsChange(next);
            return next;
        });
    }, [readOnly, onPointsChange]);

    const handlePointRemove = useCallback((index: number) => {
        if (readOnly) return;
        setPoints(prev => {
            const next = prev.filter((_, i) => i !== index);
            onPointsChange && onPointsChange(next);
            return next;
        });
    }, [readOnly, onPointsChange]);

    const handleDragEnd = useCallback((index: number, coordinate: LatLng) => {
        if (readOnly) return;
        setPoints(prev => {
            const next = [...prev];
            next[index] = coordinate;
            onPointsChange && onPointsChange(next);
            return next;
        });
    }, [readOnly, onPointsChange]);

    const clearPoints = useCallback(() => {
        setPoints([]);
        onPointsChange && onPointsChange([]);
    }, [onPointsChange]);

    const centerToMyLocation = useCallback(() => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    }, [location]);

    return (
        <View style={[styles.container, style, { height, backgroundColor: '#e5e3df', borderRadius: 20, overflow: 'hidden' }]}>
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                    latitude: 33.5731,
                    longitude: -7.5898,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                onPress={handlePress}
                showsUserLocation={mode === 'picker'}
                provider={undefined} // Use default provider (Google mostly)
            >
                {mode === 'picker' && (
                    <PickerMarkers
                        points={points}
                        savedPlaces={savedPlaces}
                        theme={theme}
                        readOnly={readOnly}
                        onPointAdd={handlePointAdd}
                        onPointRemove={handlePointRemove}
                        onDragEnd={handleDragEnd}
                    />
                )}
                {mode === 'trip' && trip && <TripMarkers trip={trip} theme={theme} />}
                {mode === 'route' && <RouteMarkers startPoint={startPoint} endPoint={endPoint} waypoints={waypoints} />}

                {/* Driver Location - Rendered separately to allow smooth movement without re-rendering everything else if mostly static */}
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
                {((mode === 'trip' || mode === 'route') && routeCoordinates.length > 1) && (
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
});

export default Map;

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
    calloutTitle: {
        fontWeight: '800',
        fontSize: 14,
        marginBottom: 2,
    },
    calloutSubtitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    calloutPrice: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
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
