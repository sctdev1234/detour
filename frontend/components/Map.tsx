import * as Location from 'expo-location';
import { Briefcase, Car, Dumbbell, GraduationCap, Home, MapPin, Navigation, Trash2, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Easing, Image, Animated as RNAnimated, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAuthStore } from '../store/useAuthStore';
import { LatLng, Trip } from '../types';
import { decodePolyline } from '../utils/location';
import { getAllPointsFromTrip, optimizeRoute, RoutePoint } from '../utils/mapUtils';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);


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
    boundsPoints?: LatLng[];
    fullScreen?: boolean;
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

const TripMarkers = React.memo(({ trip, theme, selectedRouteId, onRouteSelect, clientColors, intermediatePoints, routeCoordinates }: {
    trip: Trip, theme: any, selectedRouteId?: string | null, onRouteSelect?: (id: string) => void, clientColors?: Record<string, string>, intermediatePoints: RoutePoint[], routeCoordinates: LatLng[]
}) => {
    if (!trip) return null;
    const driverRoute = trip.routeId || {};

    // Get first client's routeId for click-to-select on driver route elements
    const firstClient = trip.clients?.[0];
    const firstClientRouteId = (firstClient?.routeId as any)?._id;
    const handleDriverRoutePress = () => {
        if (firstClientRouteId && onRouteSelect) onRouteSelect(firstClientRouteId);
    };

    // Pulse animation for next stop
    const pulseAnim = useRef(new RNAnimated.Value(0)).current;
    useEffect(() => {
        const pulse = RNAnimated.loop(
            RNAnimated.sequence([
                RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                RNAnimated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const opacityAnim = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
    const scaleAnim = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });

    // Determine the "Next" marker to pulse
    // We'll pulse the first point in intermediatePoints that isn't 'acheived'
    // Statuses: WAITING -> PICKUP_INCOMING -> IN_CAR -> DROPPED_OFF
    const getNextMarkerIndex = () => {
        return intermediatePoints.findIndex(p => {
            const client = trip.clients?.[p.clientIndex || 0];
            if (p.type === 'pickup') {
                return !client?.status || client.status === 'WAITING' || client.status === 'READY';
            }
            if (p.type === 'dropoff') {
                return client?.status === 'IN_CAR';
            }
            return false;
        });
    };

    const nextMarkerIndex = getNextMarkerIndex();

    return (
        <>
            {/* Driver Start */}
            {driverRoute.startPoint && (
                <Marker coordinate={driverRoute.startPoint} pinColor="green" onPress={handleDriverRoutePress}>
                    <View style={[styles.markerBadge, { backgroundColor: '#10b981' }]}>
                        <Car size={14} color="#fff" />
                    </View>
                </Marker>
            )}

            {/* Driver End */}
            {driverRoute.endPoint && (
                <Marker coordinate={driverRoute.endPoint} pinColor="red" onPress={handleDriverRoutePress}>
                    <View style={[styles.markerBadge, { backgroundColor: '#ef4444' }]}>
                        <MapPin size={14} color="#fff" />
                    </View>
                </Marker>
            )}

            {/* Waypoints from intermediatePoints */}
            {intermediatePoints.filter(p => p.type === 'waypoint').map((wp, i) => (
                <Marker
                    key={`waypoint-${i}`}
                    coordinate={{ latitude: wp.lat, longitude: wp.lon }}
                    onPress={handleDriverRoutePress}
                >
                    <View style={[styles.waypointMarker, { backgroundColor: theme.primary }]}>
                        <Text style={styles.waypointText}>{i + 1}</Text>
                    </View>
                </Marker>
            ))}

            {/* Client Pickup/Dropoff from intermediatePoints */}
            {intermediatePoints.filter(p => p.type === 'pickup' || p.type === 'dropoff').map((p, i) => {
                const client = trip.clients?.[p.clientIndex || 0];
                const isPickup = p.type === 'pickup';
                const routeId = (client?.routeId as any)?._id;
                const isSelected = selectedRouteId === routeId;
                const baseColor = isPickup ? '#10b981' : '#ef4444';
                const color = clientColors?.[routeId] || baseColor;
                const showFullMarker = isSelected;
                const isNext = i === nextMarkerIndex;

                return (
                    <React.Fragment key={`${p.type}-${p.clientIndex}`}>
                        <Marker
                            coordinate={{ latitude: p.lat, longitude: p.lon }}
                            onPress={() => onRouteSelect?.(routeId)}
                            anchor={{ x: 0.5, y: 0.5 }}
                            zIndex={(isSelected || isNext) ? 10 : 1}
                        >
                            {isNext && (
                                <RNAnimated.View style={[
                                    styles.pulseCircle,
                                    { backgroundColor: baseColor, opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
                                ]} />
                            )}
                            {showFullMarker ? (
                                <React.Fragment>
                                    {client?.userId?.photoURL ? (
                                        <View style={[styles.profileMarker, { borderColor: baseColor }]}>
                                            <Image source={{ uri: client.userId.photoURL }} style={styles.profileImage} />
                                        </View>
                                    ) : (
                                        <View style={[styles.clientMarker, { backgroundColor: color }]}>
                                            {isPickup ? <User size={12} color="#fff" /> : <MapPin size={12} color="#fff" />}
                                        </View>
                                    )}
                                    <Callout tooltip>
                                        <View style={styles.callout}>
                                            <View style={{ gap: 4, minWidth: 120 }}>
                                                <Text style={[styles.calloutTitle, { color: theme.text }]}>
                                                    {isPickup ? 'Pickup: ' : 'Dropoff: '}{client?.userId?.fullName || 'Client'}
                                                </Text>
                                                {client?.price && <Text style={[styles.calloutPrice, { color: theme.primary }]}>{client.price} MAD</Text>}
                                                {client?.seats && <Text style={{ fontSize: 12 }}>{client.seats} seat(s)</Text>}
                                            </View>
                                        </View>
                                    </Callout>
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
    edgePadding,
    boundsPoints,
    fullScreen = false
}: MapProps) => {
    // Fallback: use saved places from auth store if not passed as prop
    const storeUser = useAuthStore(s => s.user);
    const savedPlaces = propSavedPlaces ?? storeUser?.savedPlaces ?? [];
    const mapRef = useRef<MapView>(null);
    const [points, setPoints] = useState<LatLng[]>(initialPoints);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
    const [intermediatePoints, setIntermediatePoints] = useState<RoutePoint[]>([]);

    // Route fade-in
    const routeOpacity = useSharedValue(0);
    useEffect(() => {
        if (routeCoordinates.length > 1) {
            routeOpacity.value = withTiming(1, { duration: 1500 });
        } else {
            routeOpacity.value = 0;
        }
    }, [routeCoordinates.length]);

    const animatedPolylineProps = useAnimatedProps(() => ({
        strokeColor: `rgba(79, 70, 229, ${routeOpacity.value})`
    }));

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

    // Calculate Trip/Route Data (synced with MapLeaflet)
    React.useEffect(() => {
        if (mode === 'trip' && trip) {
            const driverRoute = trip.routeId;
            const clients = trip.clients || [];

            // Decode driver route geometry for visual polyline (road-following)
            if (driverRoute?.routeGeometry) {
                const decoded = decodePolyline(driverRoute.routeGeometry);
                setRouteCoordinates(decoded);
            } else if (driverRoute?.startPoint && driverRoute?.endPoint) {
                setRouteCoordinates([
                    driverRoute.startPoint,
                    ...(driverRoute.waypoints || []),
                    driverRoute.endPoint
                ].filter(p => p && p.latitude));
            }

            // Compute intermediate points for optimized stop ordering
            if (customStopOrder && customStopOrder.length > 0) {
                const coords = customStopOrder.map(s => ({
                    latitude: s.latitude,
                    longitude: s.longitude
                }));
                setRouteCoordinates(coords);
            } else {
                const { sortedPoints } = optimizeRoute(
                    driverRoute?.startPoint,
                    driverRoute?.endPoint,
                    driverRoute?.waypoints,
                    clients
                );
                setIntermediatePoints(sortedPoints);
            }
        } else if (mode === 'route' && startPoint && endPoint) {
            const coords: LatLng[] = [startPoint, ...waypoints, endPoint];
            setRouteCoordinates(coords);
        }
    }, [mode, trip, customStopOrder, startPoint, endPoint, waypoints]);

    // --- Optimized Auto-Center (Fit Bounds) ---
    // NO driverLocation in dependency array to avoid constant zooming
    React.useEffect(() => {
        let markersToFit: LatLng[] = [];

        // If explicit boundsPoints provided, use those instead of auto-calculating
        if (boundsPoints && boundsPoints.length > 0) {
            markersToFit = [...boundsPoints];
        } else if (mode === 'picker') {
            if (savedPlaces?.length) {
                const saved = savedPlaces.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
                markersToFit.push(...saved);
            }
            markersToFit.push(...points);
        } else if (mode === 'route') {
            if (startPoint) markersToFit.push(startPoint);
            if (endPoint) markersToFit.push(endPoint);
            if (waypoints) markersToFit.push(...waypoints);
            if (routeCoordinates.length > 0) markersToFit.push(...routeCoordinates);
        } else if (mode === 'trip' && trip) {
            // Use getAllPointsFromTrip (synced with MapLeaflet)
            const tripPoints = getAllPointsFromTrip(trip);
            markersToFit.push(...tripPoints);

            // Include polyline points for better fit
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
    }, [points, savedPlaces, trip?.id, startPoint, endPoint, waypoints, routeCoordinates, mode, edgePadding, boundsPoints]);
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
        <View style={[
            styles.container,
            style,
            {
                height,
                backgroundColor: '#e5e3df',
                borderRadius: fullScreen ? 0 : 20,
                overflow: 'hidden',
                borderWidth: fullScreen ? 0 : 1
            }
        ]}>
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
                {/* Saved Places — visible in all modes EXCEPT trip */}
                {mode !== 'trip' && (
                    <SavedPlaceMarkers
                        savedPlaces={savedPlaces}
                        theme={theme}
                        interactive={mode === 'picker' && !readOnly}
                        onPlacePress={handlePointAdd}
                    />
                )}

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
                        intermediatePoints={intermediatePoints}
                        routeCoordinates={routeCoordinates}
                    />
                )}
                {mode === 'route' && <RouteMarkers startPoint={startPoint} endPoint={endPoint} waypoints={waypoints} />}

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

                {/* Driver Route Polyline */}
                {((mode === 'trip' || mode === 'route') && routeCoordinates.length > 1) && (
                    <AnimatedPolyline
                        coordinates={routeCoordinates}
                        animatedProps={animatedPolylineProps}
                        strokeWidth={6}
                        tappable={true}
                        onPress={() => {
                            if (mode === 'trip' && trip?.clients?.length && onRouteSelect) {
                                const firstClient = trip.clients[0];
                                const routeId = (firstClient?.routeId as any)?._id || firstClient?.routeId?.id;
                                if (routeId) onRouteSelect(routeId);
                            }
                        }}
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

            <TouchableOpacity
                style={[styles.recenterBtn, { bottom: mode === 'picker' ? 80 : 40 }]}
                onPress={centerToMyLocation}
            >
                <Navigation size={22} color="#4F46E5" />
            </TouchableOpacity>

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
    },
    pulseCircle: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderRadius: 15,
        zIndex: -1,
    },
    recenterBtn: {
        position: 'absolute',
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        zIndex: 10,
    }
});
