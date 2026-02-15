import * as Location from 'expo-location';
import { Briefcase, Car, Dumbbell, GraduationCap, Home, MapPin, Navigation, Trash2, User } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { useAuthStore } from '../store/useAuthStore';
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
    interactive?: boolean;
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
    savedPlaces?: any[];
    // Selection & Data
    selectedRouteId?: string | null;
    onRouteSelect?: (routeId: string) => void;
    clientColors?: Record<string, string>;
    onMapPress?: () => void;
    edgePadding?: { top: number; right: number; bottom: number; left: number };
}

// --- Helper: get icon for saved place ---
const getSavedPlaceIcon = (iconName?: string) => {
    switch (iconName) {
        case 'home': return Home;
        case 'work': case 'briefcase': return Briefcase;
        case 'gym': return Dumbbell;
        case 'school': case 'graduation-cap': return GraduationCap;
        default: return MapPin;
    }
};

// --- Saved Place Markers (shown in ALL modes) ---
const SavedPlaceMarkers = React.memo(({ savedPlaces, theme, interactive, onPlacePress }: any) => {
    if (!savedPlaces?.length) return null;
    return (
        <>
            {savedPlaces.map((place: any, index: number) => {
                const IconComponent = getSavedPlaceIcon(place.icon);
                return (
                    <Marker
                        key={`saved-${place._id || index}`}
                        coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        onPress={interactive ? (e) => onPlacePress?.(e.nativeEvent.coordinate) : undefined}
                    >
                        <View style={[styles.savedPlaceMarker, { backgroundColor: theme.primary, borderColor: '#FFD700' }]}>
                            <IconComponent size={16} color="#fff" />
                        </View>
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={[styles.calloutTitle, { color: theme.text }]}>{place.label}</Text>
                                {place.address ? (
                                    <Text style={[styles.calloutSubtitle, { color: theme.icon }]} numberOfLines={2}>{place.address}</Text>
                                ) : null}
                                {interactive && <Text style={{ fontSize: 10, color: theme.icon, marginTop: 2 }}>Tap to add to route</Text>}
                            </View>
                        </Callout>
                    </Marker>
                );
            })}
        </>
    );
});

// --- Sub-components for Markers to prevent re-renders ---

const PickerMarkers = React.memo(({ points, theme, readOnly, onPointRemove, onDragEnd }: any) => {
    return (
        <>
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

const TripMarkers = React.memo(({ trip, theme, selectedRouteId, onRouteSelect, clientColors }: {
    trip: Trip, theme: any, selectedRouteId?: string | null, onRouteSelect?: (id: string) => void, clientColors?: Record<string, string>
}) => {
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
            {clients.map((client: any, index: number) => {
                const routeId = client.routeId?._id;
                const isSelected = selectedRouteId === routeId;
                // If a route is selected, others are dimmed or just dots.
                // User requirement: "don't show the places icon until i click... show only start and end"
                // Implication: By default (no selection), show small dots. If selected, show full markers for THAT route.
                // If nothing selected, maybe show small dots for all?

                const showFullMarker = isSelected;
                const color = clientColors?.[routeId] || theme.secondary;

                return (
                    <React.Fragment key={`client-${index}`}>
                        <Marker
                            coordinate={client.routeId.startPoint}
                            onPress={() => onRouteSelect?.(routeId)}
                            anchor={{ x: 0.5, y: 0.5 }}
                            zIndex={isSelected ? 10 : 1}
                        >
                            {showFullMarker ? (
                                <React.Fragment>
                                    {client.userId?.photoURL ? (
                                        <View style={[styles.profileMarker, { borderColor: '#10b981' }]}>
                                            <Image source={{ uri: client.userId.photoURL }} style={styles.profileImage} />
                                        </View>
                                    ) : (
                                        <View style={[styles.clientMarker, { backgroundColor: color }]}>
                                            <User size={12} color="#fff" />
                                        </View>
                                    )}
                                    <Callout tooltip>
                                        <View style={styles.callout}>
                                            <View style={{ gap: 4, minWidth: 120 }}>
                                                <Text style={[styles.calloutTitle, { color: theme.text }]}>Pickup: {client.userId?.fullName || 'Client'}</Text>
                                                {client.price && <Text style={[styles.calloutPrice, { color: theme.primary }]}>{client.price} MAD</Text>}
                                            </View>
                                        </View>
                                    </Callout>
                                </React.Fragment>
                            ) : (
                                <View style={[styles.dotMarker, { backgroundColor: color }]} />
                            )}
                        </Marker>

                        <Marker
                            coordinate={client.routeId.endPoint}
                            onPress={() => onRouteSelect?.(routeId)}
                            anchor={{ x: 0.5, y: 0.5 }}
                            zIndex={isSelected ? 10 : 1}
                        >
                            {showFullMarker ? (
                                <React.Fragment>
                                    {client.userId?.photoURL ? (
                                        <View style={[styles.profileMarker, { borderColor: '#ef4444' }]}>
                                            <Image source={{ uri: client.userId.photoURL }} style={styles.profileImage} />
                                        </View>
                                    ) : (
                                        <View style={[styles.clientMarker, { backgroundColor: color, opacity: 0.9 }]}>
                                            <MapPin size={12} color="#fff" />
                                        </View>
                                    )}
                                </React.Fragment>
                            ) : (
                                <View style={[styles.dotMarker, { backgroundColor: color }]} />
                            )}
                        </Marker>
                    </React.Fragment>
                );
            })}
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
    interactive = true,
    style,
    initialPoints = [],
    onPointsChange,
    trip,
    customStopOrder,
    startPoint,
    endPoint,
    waypoints = [],
    maxPoints,
    savedPlaces: propSavedPlaces,
    driverLocation,
    selectedRouteId,
    onRouteSelect,
    clientColors,
    onMapPress,
    edgePadding
}: MapProps) => {
    // Fallback: use saved places from auth store if not passed as prop
    const storeUser = useAuthStore(s => s.user);
    const savedPlaces = propSavedPlaces ?? storeUser?.savedPlaces ?? [];
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
                    edgePadding: edgePadding || { top: 60, right: 60, bottom: 60, left: 60 },
                    animated: true,
                });
            }, 100);
        }
    }, [points, savedPlaces, trip?.id, startPoint, endPoint, waypoints, routeCoordinates, mode, edgePadding]);
    // Note: removed driverLocation from dependencies.
    // If we want to initially center on driver, we can checking if it's the FIRST render with driver location.
    // But typically for a Trip view, seeing the whole Route is better.


    // --- Handlers ---

    const handlePress = useCallback((e: any) => {
        onMapPress?.();
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
                scrollEnabled={interactive}
                zoomEnabled={interactive}
                rotateEnabled={interactive}
                pitchEnabled={interactive}
            >
                {/* Saved Places — always visible in all modes */}
                <SavedPlaceMarkers
                    savedPlaces={savedPlaces}
                    theme={theme}
                    interactive={mode === 'picker' && !readOnly}
                    onPlacePress={handlePointAdd}
                />

                {mode === 'picker' && (
                    <PickerMarkers
                        points={points}
                        theme={theme}
                        readOnly={readOnly}
                        onPointRemove={handlePointRemove}
                        onDragEnd={handleDragEnd}
                    />
                )}
                {mode === 'trip' && trip && (
                    <TripMarkers
                        trip={trip}
                        theme={theme}
                        selectedRouteId={selectedRouteId}
                        onRouteSelect={onRouteSelect}
                        clientColors={clientColors}
                    />
                )}
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
                {/* Driver Route Polyline */}
                {((mode === 'trip' || mode === 'route') && routeCoordinates.length > 1) && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={theme.primary}
                        strokeWidth={4}
                    />
                )}

                {/* Client Route Polylines (Dashed/Thinner) */}
                {mode === 'trip' && trip?.clients?.map((client: any, index: number) => {
                    const clientGeom = client.routeId?.routeGeometry;
                    if (!clientGeom) return null;

                    const routeId = client.routeId?._id;
                    const isSelected = selectedRouteId === routeId;
                    const color = clientColors?.[routeId] || theme.secondary;
                    const clientCoords = decodePolyline(clientGeom);

                    // If selected, we might want to make it thicker or bring to front
                    const zIndex = isSelected ? 10 : 1;
                    const strokeWidth = isSelected ? 5 : 4;

                    return (
                        <Polyline
                            key={`client-route-${index}`}
                            coordinates={clientCoords}
                            strokeColor={color}
                            strokeWidth={strokeWidth}
                            lineDashPattern={isSelected ? [] : [10, 5]} // Solid if selected, dashed otherwise? Or always dashed? User didn't specify, but solid is clearer for selected.
                            tappable={interactive}
                            onPress={() => onRouteSelect?.(routeId)}
                            zIndex={zIndex}
                        />
                    );
                })}

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
    },
    dotMarker: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 2,
    }
});
