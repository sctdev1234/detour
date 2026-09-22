import * as Location from 'expo-location';
import { Briefcase, Car, Dumbbell, GraduationCap, Home, MapPin, Navigation, Trash2, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Easing, Image, Animated as RNAnimated, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Callout, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAuthStore } from '../store/useAuthStore';
import { LatLng, RoutePolyline, Trip } from '../types';
import { decodePolyline } from '../utils/location';
import { silverMapStyle } from '../constants/mapStyle';
import { getAllPointsFromTrip, optimizeRoute, RoutePoint } from '../utils/mapUtils';
import InteractiveTripRoute from './InteractiveTripRoute';
import { refinedLightMapStyle, refinedDarkMapStyle, RecenterDesign, CameraConfig } from '../constants/design';
import { RouteService } from '../services/RouteService';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);


interface StopItem {
    id: string;
    latitude: number;
    longitude: number;
}

export interface MapProps {
    mode?: 'picker' | 'trip' | 'route' | 'view' | 'interactive_routes' | 'browse' | 'driver-idle';
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

    // Interactive Routes Mode (Home Screen Browsing)
    interactiveTrips?: any[]; // Reusing existing generic trip type
    matchedClients?: any[];
    onRoutePress?: (trip: any) => void;
    onAnnotationPress?: (trip: any) => void;

    // General
    driverLocation?: { latitude: number; longitude: number; heading: number };
    savedPlaces?: any[];
    // Selection & Data
    selectedRouteId?: string | null;
    onRouteSelect?: (routeId: string) => void;
    clientColors?: Record<string, string>;
    onMapPress?: () => void;
    hidePickerControls?: boolean;
    disableTapToAdd?: boolean;
    edgePadding?: { top: number; right: number; bottom: number; left: number };
    boundsPoints?: LatLng[];
    fullScreen?: boolean;
    routePolylines?: RoutePolyline[];
    onRegionChange?: (region: any) => void;
    onRegionChangeComplete?: (region: any) => void;
    children?: React.ReactNode;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
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
                        tracksViewChanges={false}
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
                <Marker coordinate={driverRoute.startPoint} pinColor="green" onPress={handleDriverRoutePress} tracksViewChanges={false}>
                    <View style={[styles.markerBadge, { backgroundColor: '#10b981' }]}>
                        <Car size={14} color="#fff" />
                    </View>
                </Marker>
            )}

            {/* Driver End */}
            {driverRoute.endPoint && (
                <Marker coordinate={driverRoute.endPoint} pinColor="red" onPress={handleDriverRoutePress} tracksViewChanges={false}>
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
                    tracksViewChanges={false}
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
                            tracksViewChanges={false}
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
                <Marker coordinate={startPoint} anchor={{ x: 0.5, y: 1.0 }} tracksViewChanges={false}>
                    <View style={styles.teardropPin}>
                        <View style={styles.teardropDot} />
                    </View>
                </Marker>
            )}
            {endPoint && (
                <Marker coordinate={endPoint} anchor={{ x: 0.5, y: 1.0 }} tracksViewChanges={false}>
                    <View style={styles.teardropPin}>
                        <View style={styles.teardropDot} />
                    </View>
                </Marker>
            )}
            {waypoints?.map((wp: any, index: number) => (
                <Marker key={index} coordinate={wp} tracksViewChanges={false}>
                    <View style={[styles.waypointMarker, { backgroundColor: '#f59e0b' }]}>
                        <Text style={styles.waypointText}>{index + 1}</Text>
                    </View>
                </Marker>
            ))}
        </>
    );
});

const SmartPolyline = React.memo(({ route, strokeColor, strokeWidth, lineDashPattern, tappable, onPress, zIndex }: any) => {
    const [realCoords, setRealCoords] = useState<LatLng[]>(route.coords);

    useEffect(() => {
        if (route.coords?.length <= 10 && route.coords.length >= 2) {
            let active = true;
            const start = route.coords[0];
            const end = route.coords[route.coords.length - 1];
            const waypoints = route.coords.slice(1, -1);
            
            RouteService.fetchRoadRoute(start, end, waypoints).then(roadCoords => {
                if (active && roadCoords && roadCoords.length > 2) {
                    setRealCoords(roadCoords);
                }
            }).catch(e => console.log('SmartPolyline fetch error', e));
            
            return () => { active = false; };
        } else {
            setRealCoords(route.coords);
        }
    }, [route.coords]);

    const filteredCoords = realCoords.filter((c: any) => c.latitude !== 0 && c.longitude !== 0);
    
    return (
        <>
            {/* Outline / Casing for High Contrast against Traffic */}
            <Polyline
                coordinates={filteredCoords}
                strokeColor="rgba(0, 0, 0, 0.5)"
                strokeWidth={(strokeWidth || 4) + 4}
                lineDashPattern={lineDashPattern}
                zIndex={(zIndex || 2) - 1}
            />
            {/* Inner Route Line */}
            <Polyline
                coordinates={filteredCoords}
                strokeColor={strokeColor}
                strokeWidth={strokeWidth}
                lineDashPattern={lineDashPattern}
                tappable={tappable}
                onPress={onPress}
                zIndex={zIndex}
            />
        </>
    );
});

const RoutePolylines = React.memo(({ 
    routePolylines, 
    selectedRouteId, 
    onRouteSelect, 
    theme, 
    interactive = true 
}: { 
    routePolylines: any[]; 
    selectedRouteId?: string | null; 
    onRouteSelect?: (routeId: string) => void; 
    theme?: any; 
    interactive?: boolean; 
}) => {
    if (!routePolylines?.length) return null;
    return (
        <>
            {routePolylines.map((route) => {
                const isSelected = selectedRouteId === route.id || route.isSelected;
                const routeColor = isSelected ? '#3B82F6' : (route.color || '#6366f1'); // Vibrant Blue
                const strokeWidth = isSelected ? 6 : (route.width || 4);
                const zIndex = isSelected ? 10 : 2;

                return (
                    <React.Fragment key={`route-${route.id}`}>
                        {route.coords?.length > 1 && (
                            <SmartPolyline
                                route={route}
                                strokeColor={routeColor}
                                strokeWidth={strokeWidth}
                                lineDashPattern={isSelected ? [] : (route.isActive ? [] : [8, 4])}
                                tappable={interactive}
                                onPress={() => onRouteSelect?.(route.id)}
                                zIndex={zIndex}
                            />
                        )}
                        {/* Start Marker */}
                        {route.startPoint && route.startPoint.latitude !== 0 && route.startPoint.longitude !== 0 && (
                            <Marker 
                                coordinate={route.startPoint} 
                                anchor={{ x: 0.5, y: 0.5 }} 
                                tracksViewChanges={false}
                                onPress={() => onRouteSelect?.(route.id)}
                                zIndex={zIndex + 1}
                            >
                                <View style={[styles.routeEndpoint, {
                                    backgroundColor: isSelected ? '#3B82F6' : 'rgba(79, 70, 229, 0.6)',
                                    borderColor: '#fff',
                                    borderWidth: isSelected ? 3 : 2.5,
                                    transform: [{ scale: isSelected ? 1.2 : 1.0 }]
                                }]}>
                                    <View style={styles.routeEndpointInner} />
                                </View>
                            </Marker>
                        )}
                        {/* End Marker */}
                        {route.endPoint && route.endPoint.latitude !== 0 && route.endPoint.longitude !== 0 && (
                            <Marker 
                                coordinate={route.endPoint} 
                                anchor={{ x: 0.5, y: 0.5 }} 
                                tracksViewChanges={false}
                                onPress={() => onRouteSelect?.(route.id)}
                                zIndex={zIndex + 1}
                            >
                                <View style={[styles.routeEndpoint, {
                                    backgroundColor: isSelected ? '#ef4444' : (route.isActive ? '#ef4444' : 'rgba(239, 68, 68, 0.5)'),
                                    borderColor: '#fff',
                                    borderWidth: isSelected ? 3 : 2.5,
                                    transform: [{ scale: isSelected ? 1.2 : 1.0 }]
                                }]}>
                                    <View style={styles.routeEndpointInner} />
                                </View>
                            </Marker>
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
});

// --- Main Component ---

// Map styles are now imported from constants/design.ts
// (refinedLightMapStyle, refinedDarkMapStyle)

const EMPTY_ARRAY: any[] = [];

const Map = React.memo(React.forwardRef<MapView, MapProps>(({
    mode = 'view',
    theme,
    height = 300,
    readOnly = false,
    interactive = true,
    style,
    initialPoints = EMPTY_ARRAY,
    onPointsChange,
    trip,
    customStopOrder,
    startPoint,
    endPoint,
    waypoints = EMPTY_ARRAY,
    matchedClients,
    maxPoints,
    savedPlaces: propSavedPlaces,
    driverLocation,
    selectedRouteId,
    onRouteSelect,
    interactiveTrips = EMPTY_ARRAY,
    onRoutePress,
    onAnnotationPress,
    clientColors,
    onMapPress,
    edgePadding,
    boundsPoints,
    routePolylines,
    fullScreen = false,
    onRegionChange,
    onRegionChangeComplete,
    hidePickerControls = false,
    disableTapToAdd = false,
    children,
    initialRegion = {
        latitude: 33.5731,
        longitude: -7.5898,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    }
}, forwardedRef) => {
    const mapStyle = theme?.dark || theme?.text === '#FFFFFF' ? refinedDarkMapStyle : refinedLightMapStyle;

    // Fallback: use saved places from auth store if not passed as prop
    const storeUser = useAuthStore(s => s.user);
    const savedPlaces = propSavedPlaces ?? storeUser?.savedPlaces ?? [];
    const internalMapRef = useRef<any>(null);
    const mapRef = (forwardedRef as React.MutableRefObject<any>) || internalMapRef;
    const hasFitPickerRef = useRef(false);
    const fetchedRouteKeyRef = useRef<string>('');
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
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                let loc;
                try {
                    loc = await Location.getCurrentPositionAsync({});
                } catch (err) {
                    loc = await Location.getLastKnownPositionAsync({});
                    if (!loc) throw err;
                }
                setLocation(loc);
            } catch (error) {
                console.warn('Location unavailable in Map:', error);
            }
        })();
    }, []);

    // Sync initial points
    React.useEffect(() => {
        if (initialPoints) {
            setPoints(prev => {
                const isDifferent = initialPoints.length !== prev.length ||
                    initialPoints.some((p, idx) => p.latitude !== prev[idx]?.latitude || p.longitude !== prev[idx]?.longitude);
                if (isDifferent) {
                    if (initialPoints.length === 0) {
                        hasFitPickerRef.current = false;
                    }
                    return initialPoints;
                }
                return prev;
            });
        }
    }, [initialPoints]);

    // Calculate Trip/Route Data (synced with MapLeaflet)
    React.useEffect(() => {
        let start: LatLng | undefined;
        let end: LatLng | undefined;
        let wps: LatLng[] = [];
        let geom: string | undefined;

        if (mode === 'trip' && trip) {
            const driverRoute = trip.routeId || trip;
            geom = driverRoute?.routeGeometry;
            start = driverRoute?.startPoint || (driverRoute as any)?.pickup;
            end = driverRoute?.endPoint || (driverRoute as any)?.destination;
            wps = driverRoute?.waypoints || [];

            const clients = trip.clients || [];
            if (customStopOrder && customStopOrder.length > 0) {
                const coords = customStopOrder.map(s => ({
                    latitude: s.latitude,
                    longitude: s.longitude
                }));
                setRouteCoordinates(prev => {
                    const isSame = prev.length === coords.length && prev.every((p, i) => p.latitude === coords[i].latitude && p.longitude === coords[i].longitude);
                    return isSame ? prev : coords;
                });
            } else if (driverRoute?.startPoint && driverRoute?.endPoint) {
                const { sortedPoints } = optimizeRoute(
                    driverRoute.startPoint,
                    driverRoute.endPoint,
                    driverRoute.waypoints,
                    clients
                );
                setIntermediatePoints(sortedPoints);
            }
        } else if (startPoint && endPoint) {
            start = startPoint;
            end = endPoint;
            wps = waypoints || [];
        } else if (mode === 'picker' && points.length > 1) {
            start = points[0];
            end = points[points.length - 1];
            wps = points.slice(1, -1);
        }

        if (geom) {
            const decoded = decodePolyline(geom);
            if (decoded.length > 0) {
                setRouteCoordinates(decoded);
                return;
            }
        }

        if (start && end && typeof start.latitude === 'number' && typeof end.latitude === 'number') {
            const wpsStr = wps.map(p => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`).join('|');
            const routeKey = `${start.latitude.toFixed(5)},${start.longitude.toFixed(5)}-${end.latitude.toFixed(5)},${end.longitude.toFixed(5)}|${wpsStr}`;
            
            if (fetchedRouteKeyRef.current === routeKey && routeCoordinates.length > 2) {
                return;
            }

            let active = true;
            fetchedRouteKeyRef.current = routeKey;

            RouteService.fetchRoadRoute(start, end, wps).then(roadCoords => {
                if (active && roadCoords && roadCoords.length > 1) {
                    setRouteCoordinates(roadCoords);
                }
            });
            return () => { active = false; };
        } else if (mode === 'picker' && points.length <= 1) {
            setRouteCoordinates([]);
        }
    }, [mode, trip, customStopOrder, startPoint?.latitude, startPoint?.longitude, endPoint?.latitude, endPoint?.longitude, points]);

    // --- Optimized Auto-Center (Fit Bounds) ---
    // NO driverLocation in dependency array to avoid constant zooming
    React.useEffect(() => {
        let markersToFit: LatLng[] = [];

        // If explicit boundsPoints provided, use those instead of auto-calculating
        if (boundsPoints && boundsPoints.length > 0) {
            markersToFit = [...boundsPoints];
        } else if (mode === 'picker') {
            if (!hasFitPickerRef.current) {
                if (points.length > 0) {
                    markersToFit = [...points];
                    hasFitPickerRef.current = true;
                } else if (savedPlaces?.length) {
                    markersToFit = savedPlaces.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
                    hasFitPickerRef.current = true;
                }
            }
        } else if (mode === 'route') {
            if (startPoint) markersToFit.push(startPoint);
            if (endPoint) markersToFit.push(endPoint);
            if (waypoints) markersToFit.push(...waypoints);
            if (routeCoordinates.length > 0) markersToFit.push(...routeCoordinates);
            if (matchedClients && matchedClients.length > 0) {
                matchedClients.forEach((m: any) => {
                    const r = m.route || m;
                    if (r.startPoint && typeof r.startPoint.latitude === 'number') markersToFit.push(r.startPoint);
                    if (r.endPoint && typeof r.endPoint.latitude === 'number') markersToFit.push(r.endPoint);
                });
            }
        } else if (mode === 'trip' && trip) {
            // Use getAllPointsFromTrip (synced with MapLeaflet)
            const tripPoints = getAllPointsFromTrip(trip);
            markersToFit.push(...tripPoints);

            // Include polyline points for better fit
            if (routeCoordinates.length > 0) markersToFit.push(...routeCoordinates);
        } else if (mode === 'interactive_routes' && interactiveTrips.length > 0) {
            if (selectedRouteId) {
                const selected = interactiveTrips.find(t => t.id === selectedRouteId || t.routeId === selectedRouteId);
                if (selected) {
                    if (selected.startPoint) markersToFit.push(selected.startPoint);
                    if (selected.endPoint) markersToFit.push(selected.endPoint);
                    if (selected.waypoints) markersToFit.push(...selected.waypoints);
                    if (selected.routeGeometry) {
                         const decoded = decodePolyline(selected.routeGeometry);
                         markersToFit.push(...decoded);
                    }
                }
            } else {
                interactiveTrips.forEach(t => {
                    if (t.startPoint) markersToFit.push(t.startPoint);
                    if (t.endPoint) markersToFit.push(t.endPoint);
                    if (t.waypoints) markersToFit.push(...t.waypoints);
                });
            }
        }

        // Filter invalid points
        // @ts-ignore
        markersToFit = markersToFit.filter(p => p && typeof p.latitude === 'number' && typeof p.longitude === 'number');

        if (markersToFit.length > 0 && mapRef.current) {
            setTimeout(() => {
                if (markersToFit.length === 1) {
                    mapRef.current?.animateToRegion({
                        latitude: markersToFit[0].latitude,
                        longitude: markersToFit[0].longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }, 500);
                } else {
                    const firstPt = markersToFit[0];
                    const allSame = markersToFit.every(p => Math.abs(p.latitude - firstPt.latitude) < 0.00001 && Math.abs(p.longitude - firstPt.longitude) < 0.00001);
                    if (allSame) {
                        mapRef.current?.animateToRegion({
                            latitude: firstPt.latitude,
                            longitude: firstPt.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }, 500);
                    } else {
                        mapRef.current?.fitToCoordinates(markersToFit, {
                            edgePadding: edgePadding || { top: 120, right: 40, bottom: 160, left: 40 },
                            animated: true,
                        });
                    }
                }
                
                // Keep flat view for route browsing — no dramatic pitch
                // Browsing is not navigation; camera stays calm
                if (mode === 'interactive_routes') {
                    setTimeout(() => {
                        mapRef.current?.animateToViewingAngle(CameraConfig.overviewPitch, 500);
                    }, 200);
                }
            }, 100);
        }
    }, [points, savedPlaces, trip?.id, startPoint, endPoint, waypoints, routeCoordinates, mode, edgePadding, boundsPoints, interactiveTrips, selectedRouteId]);
    // Note: removed driverLocation from dependencies.
    // If we want to initially center on driver, we can checking if it's the FIRST render with driver location.
    // But typically for a Trip view, seeing the whole Route is better.


    // --- Handlers ---

    const handlePress = useCallback((e: any) => {
        onMapPress?.();
        if (mode !== 'picker' || readOnly || disableTapToAdd) return;
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
    }, [mode, readOnly, disableTapToAdd, points, maxPoints, onPointsChange]);

    const handlePointAdd = useCallback((coordinate: LatLng) => {
        if (readOnly || disableTapToAdd) return;
        setPoints(prev => {
            const next = [...prev, coordinate];
            onPointsChange && onPointsChange(next);
            return next;
        });
    }, [readOnly, disableTapToAdd, onPointsChange]);

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
                ref={mapRef as any}
                style={[styles.map, style, { height }]}
                initialRegion={initialRegion}
                provider={PROVIDER_GOOGLE}
                showsUserLocation
                showsTraffic={true}
                showsMyLocationButton={false}
                customMapStyle={silverMapStyle}
                showsCompass={false}
                scrollEnabled={!readOnly && interactive}
                zoomEnabled={!readOnly && interactive}
                pitchEnabled={!readOnly && interactive}
                rotateEnabled={!readOnly && interactive}
                onPress={handlePress}
                onRegionChange={onRegionChange}
                onRegionChangeComplete={onRegionChangeComplete}
                clusterColor={theme.colors?.primary || theme.primary}
                clusterTextColor={theme.colors?.background || theme.background}
                radius={40}
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
                {(mode === 'route' && (!routePolylines || routePolylines.length === 0)) && <RouteMarkers startPoint={startPoint} endPoint={endPoint} waypoints={waypoints} />}

                {/* Driver Location */}
                {driverLocation && (
                    <Marker
                        key="driver-location-marker"
                        coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        rotation={driverLocation.heading}
                        tracksViewChanges={true}
                    >
                        <View style={[styles.carMarker, { backgroundColor: theme.primary }]}>
                            <Car size={20} color="#fff" />
                        </View>
                    </Marker>
                )}

                {/* Polylines */}
                {(mode === 'picker' && points.length > 1) && (
                    <Polyline
                        coordinates={routeCoordinates.length > 1 ? routeCoordinates : points}
                        strokeColor={theme.primary}
                        strokeWidth={4}
                    />
                )}

                {/* Driver Route Polyline (Leaflet style red road line with casing) */}
                {((mode === 'trip' || mode === 'route') && (!routePolylines || routePolylines.length === 0) && routeCoordinates.length > 1) && (
                    <>
                        {/* Dark translucent casing for pop effect */}
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeColor="rgba(0, 0, 0, 0.4)"
                            strokeWidth={10}
                        />
                        {/* Vibrant Electric Blue inner line */}
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeColor="#3b82f6"
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
                    </>
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

                {/* Interactive Routes Mode */}
                {mode === 'interactive_routes' && interactiveTrips.map(t => {
                    const id = t.id || t.routeId;
                    return (
                        <InteractiveTripRoute
                            key={`interactive-${id}`}
                            trip={t}
                            isSelected={selectedRouteId === id}
                            onPress={onRoutePress!}
                            onAnnotationPress={onAnnotationPress!}
                            theme={theme}
                            otherAnchors={[]} // For now, we will just pass empty array. If we want global avoidance, we'd need to precompute.
                        />
                    );
                })}

                {/* Saved & Personal Routes (Driver idle, browse, client view) */}
                {routePolylines && routePolylines.length > 0 && (
                    <RoutePolylines 
                        routePolylines={routePolylines} 
                        selectedRouteId={selectedRouteId}
                        onRouteSelect={onRouteSelect}
                        theme={theme}
                        interactive={interactive}
                    />
                )}

                {/* Matched Clients on Driver Route */}
                {matchedClients && matchedClients.length > 0 && matchedClients.map((matchItem: any, idx: number) => {
                    const r = matchItem.route || matchItem;
                    const clientUser = r.userId;
                    const pickupPt = r.startPoint;
                    const destPt = r.endPoint;
                    const clientFare = r.price?.amount ?? r.price ?? 0;
                    const clientName = clientUser?.fullName || `Client #${idx + 1}`;

                    const pickupValid = pickupPt && typeof pickupPt.latitude === 'number' && typeof pickupPt.longitude === 'number';
                    const destValid = destPt && typeof destPt.latitude === 'number' && typeof destPt.longitude === 'number';

                    let clientRouteCoords: LatLng[] = [];
                    if (r.routeGeometry) {
                        clientRouteCoords = decodePolyline(r.routeGeometry).filter((p: any) => p && typeof p.latitude === 'number');
                    } else if (pickupValid && destValid) {
                        clientRouteCoords = [pickupPt, destPt];
                    }

                    return (
                        <React.Fragment key={`matched-client-native-${r.id || idx}`}>
                            {clientRouteCoords.length > 1 && (
                                <Polyline
                                    coordinates={clientRouteCoords}
                                    strokeColor="#06b6d4"
                                    strokeWidth={4}
                                    lineDashPattern={[8, 6]}
                                />
                            )}
                            {pickupValid && (
                                <Marker coordinate={pickupPt}>
                                    <View style={[styles.markerBadge, { backgroundColor: '#10b981' }]}>
                                        <User size={14} color="#fff" />
                                    </View>
                                    <Callout>
                                        <View style={styles.callout}>
                                            <Text style={[styles.calloutTitle, { color: theme.text }]}>{clientName}</Text>
                                            <Text style={[styles.calloutSubtitle, { color: theme.icon }]}>Pickup • {clientFare} MAD</Text>
                                        </View>
                                    </Callout>
                                </Marker>
                            )}
                            {destValid && (
                                <Marker coordinate={destPt}>
                                    <View style={[styles.markerBadge, { backgroundColor: '#8b5cf6' }]}>
                                        <MapPin size={12} color="#fff" />
                                    </View>
                                </Marker>
                            )}
                        </React.Fragment>
                    );
                })}

                {/* Additional custom overlays */}
                {children}

            </MapView>

            <TouchableOpacity
                style={[styles.recenterBtn, { bottom: mode === 'picker' ? 120 : 40 }]}
                onPress={centerToMyLocation}
                accessibilityLabel="Center on my location"
                accessibilityRole="button"
                activeOpacity={0.8}
            >
                <Navigation size={RecenterDesign.iconSize} color={RecenterDesign.iconColor} />
            </TouchableOpacity>

            {/* Controls for Picker Mode */}
            {mode === 'picker' && !readOnly && !hidePickerControls && (
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
}));

export default Map;

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: '#ccc',
    },
    map: {
        width: '100%',
        height: '100%',
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
        right: 16,
        width: RecenterDesign.size,
        height: RecenterDesign.size,
        borderRadius: RecenterDesign.borderRadius,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 15,
        ...RecenterDesign.shadow,
    },
    userLocationMarker: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#007AFF',
        borderWidth: 2,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        // @ts-ignore
        boxShadow: '0px 2px 6px rgba(0,0,0,0.3)',
    },
    routeEndpoint: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    routeEndpointInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
    pinBubble: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 6,
        // @ts-ignore
        boxShadow: '0px 3px 8px rgba(0,0,0,0.3)',
    },
    teardropPin: {
        width: 30,
        height: 36,
        backgroundColor: '#2563eb',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 3,
        transform: [{ rotate: '-45deg' }],
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        // @ts-ignore
        boxShadow: '0px 3px 8px rgba(0,0,0,0.3)',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    teardropDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ffffff',
        transform: [{ rotate: '45deg' }],
    },
});
