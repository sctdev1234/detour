import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    StyleSheet,
    useColorScheme,
    View,
} from 'react-native';
import { Colors } from '../../constants/theme';
import DetourMap from '../Map';
import Animated, {
    Easing as REasing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useMatches, useRoutes, useTrips, useInvitePassenger, useRemoveRoute } from '../../hooks/api/useTripQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useLocationStore } from '../../store/useLocationStore';
import { usePlacesStore } from '../../store/usePlacesStore';
import { formatRoutesToPolylines } from '../../utils/mapUtils';
import { IN_PROGRESS_STATUSES } from '../../utils/timeUtils';
import FloatingTopBar from './FloatingTopBar';
import QuickActions from './QuickActions';
import { DriverRouteSelector } from './DriverRouteSelector';
import { DriverRouteDetailsCard } from './DriverRouteDetailsCard';
import { DriverFindingClientsPanel } from './DriverFindingClientsPanel';
import { DriverNotificationToast, DriverNotificationData } from './DriverNotificationToast';
import DriverTripExperience from '../dispatch/driver/DriverTripExperience';
import { dispatchSocket } from '../../services/dispatchSocket';
import { useUIStore } from '../../store/useUIStore';
import { useDriverDispatchStore } from '../../store/useDriverDispatchStore';
import { useDispatchStore } from '../../store/useDispatchStore';
import { driverDispatchActions } from '../../store/driverDispatchActions';
import { LatLng } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default region (Casablanca)
const DEFAULT_REGION = {
    latitude: 33.5731,
    longitude: -7.5898,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
};

interface DashboardScreenProps {
    onMenuPress: () => void;
}

export default function DashboardScreen({ onMenuPress }: DashboardScreenProps) {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const mapRef = useRef<any>(null);

    const { user } = useAuthStore();
    const { location: trackedLocation } = useLocationStore();
    const { places, fetchPlaces } = usePlacesStore();
    const { 
        showSavedPlaces, 
        showSavedRoutes, 
        driverStatus,
        selectedRouteId,
        setSelectedRouteId,
        isFindingClientsOpenByRoute,
        setFindingClientsForRoute
    } = useDashboardStore();
    const { featureFlags, showToast } = useUIStore();
    const { mutateAsync: removeRoute, isPending: isDeletingRoute } = useRemoveRoute();
    const { mutateAsync: invitePassenger, isPending: isInviting } = useInvitePassenger();

    const driverV2Status = useDriverDispatchStore((s) => s.presence === 'ONLINE' ? 'ONLINE' : 'OFFLINE'); // Temporary simplify for Dashboard logic
    const driverV2ActiveTrip = useDriverDispatchStore((s) => s.activeTrip);
    const currentOffer = useDriverDispatchStore((s) => s.currentOffer);
    const passengerV2ActiveTrip = useDispatchStore((s) => s.assignment || s.tripInstance);

    const presence = useDriverDispatchStore((s) => s.presence);

    const { data: allTrips } = useTrips();
    const { data: allRoutes } = useRoutes();

    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

    // Filter trips for current driver
    const trips = allTrips?.filter((t: any) =>
        t.driverId?._id === user?.id ||
        t.driverId?.id === user?.id ||
        t.driverId === user?.id
    ) || [];

    // Filter routes for current driver (All Driver Routes)
    const driverRoutes = React.useMemo(() => {
        return (allRoutes || []).filter((r: any) =>
            r.role === 'driver' || r.userId === user?.id || r.userId?._id === user?.id
        );
    }, [allRoutes, user?.id]);

    // Selected route derived from independent selectedRouteId
    const selectedRoute = React.useMemo(() => {
        if (!selectedRouteId) return null;
        return driverRoutes.find((r: any) => (r.id || r._id) === selectedRouteId) || null;
    }, [driverRoutes, selectedRouteId]);

    const isFindingOpen = selectedRouteId ? !!isFindingClientsOpenByRoute[selectedRouteId] : false;

    const [notification, setNotification] = useState<DriverNotificationData | null>(null);

    // Route selection handler
    const handleSelectRoute = useCallback((routeId: string) => {
        const nextId = selectedRouteId === routeId ? null : routeId;
        setSelectedRouteId(nextId);

        if (nextId) {
            const r = driverRoutes.find((dr: any) => (dr.id || dr._id) === nextId);
            if (r?.status === 'active' || r?.status === 'MATCHING') {
                setFindingClientsForRoute(nextId, true);
            }
            const lat = r?.startPoint?.latitude ?? (r?.startPoint as any)?.coordinates?.[1];
            const lon = r?.startPoint?.longitude ?? (r?.startPoint as any)?.coordinates?.[0];
            if (lat && lon && mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: lat,
                    longitude: lon,
                    latitudeDelta: 0.06,
                    longitudeDelta: 0.06,
                }, 600);
            }
        }
    }, [selectedRouteId, driverRoutes, setSelectedRouteId, setFindingClientsForRoute]);

    // Realtime notification listeners
    useEffect(() => {
        const handleTripSearching = (data: any) => {
            const rId = data.driverRouteId || data.routeId;
            if (rId) {
                setNotification({
                    id: `search-${Date.now()}`,
                    routeId: rId,
                    type: 'new_match',
                    clientName: data.clientName || 'Passenger',
                    pickup: data.pickup,
                    fare: data.fare || data.estimatedFare,
                });
            }
        };

        const handleDriverAssigned = (data: any) => {
            const rId = data.driverRouteId || data.routeId;
            if (rId) {
                setNotification({
                    id: `assigned-${Date.now()}`,
                    routeId: rId,
                    type: 'offer_accepted',
                    clientName: data.clientName || 'Passenger',
                    pickup: data.pickup,
                    fare: data.fare,
                });
            }
        };

        const unsubSearching = dispatchSocket.onTripSearching(handleTripSearching);
        const unsubAssigned = dispatchSocket.onDriverAssigned(handleDriverAssigned);

        return () => {
            unsubSearching();
            unsubAssigned();
        };
    }, []);

    const handleNotificationView = useCallback((routeId: string) => {
        setSelectedRouteId(routeId);
        setFindingClientsForRoute(routeId, true);
        setNotification(null);
        const r = driverRoutes.find((dr: any) => (dr.id || dr._id) === routeId);
        const lat = r?.startPoint?.latitude ?? (r?.startPoint as any)?.coordinates?.[1];
        const lon = r?.startPoint?.longitude ?? (r?.startPoint as any)?.coordinates?.[0];
        if (lat && lon && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: lat,
                longitude: lon,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
            }, 600);
        }
    }, [driverRoutes, setSelectedRouteId, setFindingClientsForRoute]);

    // V1 Active trip
    const v1ActiveTrip = trips.find((t: any) =>
        IN_PROGRESS_STATUSES.includes(t.status) || t.status === 'active'
    );

    // Resolved Active Trip (V2 takes precedence)
    const activeTrip = featureFlags.enableV2DriverDispatch && driverV2ActiveTrip ? driverV2ActiveTrip :
                       featureFlags.enableV2Dispatch && passengerV2ActiveTrip ? passengerV2ActiveTrip :
                       v1ActiveTrip;

    // Active route matches strictly scoped to selected route
    const isDriverSearching = presence === 'ONLINE' && !activeTrip;
    const targetRouteForMatches = selectedRoute;
    const activeRouteId = targetRouteForMatches ? (targetRouteForMatches.id || (targetRouteForMatches as any)._id || null) : null;
    const { data: rawMatchedClients, refetch: refetchMatches } = useMatches(activeRouteId);
    const matchedClients = React.useMemo(() => {
        if (!rawMatchedClients) return [];
        return rawMatchedClients;
    }, [rawMatchedClients]);

    // Recover state on mount (e.g. if driver was already ONLINE or has active offer)
    useEffect(() => {
        driverDispatchActions.recoverState().then(() => {
            refetchMatches();
        });
    }, [refetchMatches]);

    // Re-fetch matches whenever driver status transitions to ONLINE
    useEffect(() => {
        if (presence === 'ONLINE') {
            refetchMatches();
        }
    }, [presence, refetchMatches]);

    // Find the primary trip to show on map (active or next scheduled)
    const tripToDisplay = React.useMemo(() => {
        if (activeTrip) return activeTrip;
        // Fallback to first non-completed trip
        return trips.find(t => 
            t.status?.toLowerCase() !== 'completed' && 
            t.status?.toLowerCase() !== 'cancelled'
        );
    }, [activeTrip, trips]);

    // Display route on map while waiting for clients or active
    const displayRoute = React.useMemo(() => {
        const getPt = (p: any): LatLng | undefined => {
            if (!p) return undefined;
            if (typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude !== 0) {
                return { latitude: p.latitude, longitude: p.longitude, address: p.address };
            }
            if (Array.isArray(p.coordinates) && p.coordinates.length >= 2) {
                return { latitude: p.coordinates[1], longitude: p.coordinates[0], address: p.address };
            }
            return undefined;
        };

        // 1. Active trip
        if (activeTrip) {
            const r = activeTrip.routeId || activeTrip;
            const start = getPt(r.startPoint || r.pickup);
            const end = getPt(r.endPoint || r.destination);
            if (start && end) {
                return {
                    startPoint: start,
                    endPoint: end,
                    waypoints: (r.waypoints || []).map(getPt).filter(Boolean) as LatLng[],
                    trip: activeTrip,
                };
            }
        }

        // 2. Incoming offer
        if (currentOffer) {
            const start = getPt(currentOffer.pickup);
            const end = getPt(currentOffer.destination);
            if (start && end) {
                return {
                    startPoint: start,
                    endPoint: end,
                    waypoints: [],
                    trip: undefined,
                };
            }
        }

        // 3. Next scheduled trip
        if (tripToDisplay?.routeId) {
            const r = tripToDisplay.routeId;
            const start = getPt(r.startPoint);
            const end = getPt(r.endPoint);
            if (start && end) {
                return {
                    startPoint: start,
                    endPoint: end,
                    waypoints: (r.waypoints || []).map(getPt).filter(Boolean) as LatLng[],
                    trip: tripToDisplay,
                };
            }
        }

        // 4. Driver's created route (when viewing a selected route)
        const targetRoute = selectedRoute;
        if (targetRoute) {
            const start = getPt(targetRoute.startPoint);
            const end = getPt(targetRoute.endPoint);
            if (start && end) {
                return {
                    startPoint: start,
                    endPoint: end,
                    waypoints: (targetRoute.waypoints || []).map(getPt).filter(Boolean) as LatLng[],
                    trip: undefined,
                };
            }
        }

        return {
            startPoint: undefined,
            endPoint: undefined,
            waypoints: [],
            trip: undefined,
        };
    }, [activeTrip, currentOffer, tripToDisplay, selectedRoute]);

    const mapMode = React.useMemo(() => {
        if (displayRoute.trip) return 'trip';
        if (displayRoute.startPoint && displayRoute.endPoint) return 'route';
        return presence === 'ONLINE' ? 'driver-idle' : 'browse';
    }, [displayRoute, presence]);

    const dynamicEdgePadding = React.useMemo(() => ({
        top: 140, // Top bar offset
        right: 40,
        bottom: 340, // Bottom card offset
        left: 40,
    }), []);

    // --- Pulsing animation for user location dot ---
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0.4);

    useEffect(() => {
        pulseScale.value = withRepeat(
            withTiming(2.5, { duration: 2000, easing: REasing.out(REasing.ease) }),
            -1,
            false
        );
        pulseOpacity.value = withRepeat(
            withTiming(0, { duration: 2000, easing: REasing.out(REasing.ease) }),
            -1,
            false
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }));

    // --- Get location ---
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                let loc;
                try {
                    loc = await Location.getCurrentPositionAsync({});
                } catch (err) {
                    loc = await Location.getLastKnownPositionAsync({});
                    if (!loc) throw err;
                }
                setCurrentLocation(loc);
            } catch (error) {
                console.warn('Location unavailable in DashboardScreen:', error);
            }
        })();
    }, []);

    // --- Fetch saved places ---
    useEffect(() => {
        fetchPlaces();
    }, []);

    // --- Center map to user location ---
    const centerToMyLocation = useCallback(() => {
        const loc = trackedLocation || currentLocation;
        if (loc && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 500);
        }
    }, [trackedLocation, currentLocation]);

    // --- Initial center ---
    useEffect(() => {
        const loc = trackedLocation || currentLocation;
        if (loc && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
            }, 1000);
        }
    }, [currentLocation]);

    // --- Get user coords ---
    const userCoords = React.useMemo(() => {
        const loc = (trackedLocation && trackedLocation.coords.latitude !== 0 && trackedLocation.coords.longitude !== 0)
            ? trackedLocation
            : (currentLocation && currentLocation.coords.latitude !== 0 && currentLocation.coords.longitude !== 0)
                ? currentLocation
                : null;
        if (!loc) return null;
        return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    }, [
        trackedLocation?.coords?.latitude,
        trackedLocation?.coords?.longitude,
        currentLocation?.coords?.latitude,
        currentLocation?.coords?.longitude
    ]);

    const routePolylines = React.useMemo(() => {
        // Render all driver routes simultaneously with canonical selection state
        return formatRoutesToPolylines(driverRoutes, selectedRouteId, {
            theme,
            isDark: colorScheme === 'dark',
            primaryColor: theme.primary,
        });
    }, [driverRoutes, selectedRouteId, theme, colorScheme]);

    // --- Saved places icons ---
    const getSavedPlaceColor = (icon?: string) => {
        switch (icon) {
            case 'home': return '#4F46E5';
            case 'work': case 'briefcase': return '#F59E0B';
            case 'gym': return '#EF4444';
            case 'school': case 'graduation-cap': return '#10B981';
            default: return theme.primary;
        }
    };

    return (
        <View style={styles.container}>
            {/* FULLSCREEN MAP */}
            <View style={StyleSheet.absoluteFillObject}>
                <DetourMap
                    ref={mapRef}
                    mode={mapMode as any}
                    theme={theme}
                    fullScreen={true}
                    height="100%"
                    interactive={true}
                    style={StyleSheet.absoluteFillObject}
                    initialRegion={DEFAULT_REGION}
                    trip={displayRoute.trip || tripToDisplay}
                    startPoint={displayRoute.startPoint}
                    endPoint={displayRoute.endPoint}
                    waypoints={displayRoute.waypoints}
                    matchedClients={matchedClients}
                    routePolylines={routePolylines}
                    selectedRouteId={selectedRouteId}
                    onRouteSelect={handleSelectRoute}
                    edgePadding={dynamicEdgePadding}
                />
            </View>

            {/* ===== FLOATING UI LAYERS ===== */}

            {/* Top Bar */}
            <FloatingTopBar 
                onMenuPress={onMenuPress} 
                driverRoutesCount={driverRoutes.length}
                matchedClientsCount={matchedClients.length}
            />

            {/* Driver Notification Toast (Top) */}
            <DriverNotificationToast
                notification={notification}
                onView={handleNotificationView}
                onDismiss={() => setNotification(null)}
            />

            {/* Quick Actions (Right Side) */}
            <QuickActions
                onCenterMap={centerToMyLocation}
                onCreateRoute={() => router.push('/(driver)/add-route')}
                isOnline={presence === 'ONLINE'}
                onToggleStatus={async () => {
                    if (presence === 'ONLINE') {
                        await driverDispatchActions.goOffline();
                    } else {
                        await driverDispatchActions.goOnline();
                    }
                }}
                isRouteSelected={!!selectedRoute || !!activeTrip || !!currentOffer}
                isFindingOpen={isFindingOpen}
            />

            {/* Driver Dispatch & Multi-Route Overlay */}
            {activeTrip || currentOffer ? (
                <View style={{ position: 'absolute', bottom: 20, left: 0, right: 0, zIndex: 50 }}>
                    <DriverTripExperience matchedClients={matchedClients} activeRoute={selectedRoute || (activeTrip?.routeId as any)} />
                </View>
            ) : (
                <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0, zIndex: 50, gap: 8 }}>
                    {selectedRoute && (
                        isFindingOpen ? (
                            <DriverFindingClientsPanel
                                route={selectedRoute}
                                matchedClients={matchedClients}
                                onClose={() => {
                                    if (selectedRouteId) {
                                        setFindingClientsForRoute(selectedRouteId, false);
                                    }
                                }}
                                onInviteClient={async (clientRouteId, fare) => {
                                    if (selectedRouteId) {
                                        try {
                                            await invitePassenger({
                                                clientRouteId,
                                                driverRouteId: selectedRouteId,
                                                proposedPrice: fare
                                            });
                                            showToast('Invitation sent to passenger', 'success');
                                        } catch (err: any) {
                                            showToast(err?.message || 'Failed to send invitation', 'error');
                                        }
                                    }
                                }}
                                isInviting={isInviting}
                                onBoardPassenger={async (tripInstanceId, otp) => {
                                    try {
                                        await driverDispatchActions.boardPassenger(tripInstanceId, otp);
                                        showToast('Passenger boarded successfully', 'success');
                                    } catch (err: any) {
                                        showToast(err?.message || 'Boarding verification failed', 'error');
                                    }
                                }}
                            />
                        ) : (
                            <DriverRouteDetailsCard
                                route={selectedRoute}
                                onClose={() => setSelectedRouteId(null)}
                                onDelete={async (id) => {
                                    try {
                                        await removeRoute(id);
                                        setSelectedRouteId(null);
                                        showToast('Route removed successfully', 'success');
                                    } catch (err: any) {
                                        showToast(err?.message || 'Failed to remove route', 'error');
                                    }
                                }}
                                isDeleting={isDeletingRoute}
                                isOnline={presence === 'ONLINE'}
                                onToggleStatus={async () => {
                                    if (presence === 'ONLINE') {
                                        await driverDispatchActions.goOffline();
                                    } else {
                                        await driverDispatchActions.goOnline();
                                    }
                                }}
                                isFindingOpen={isFindingOpen}
                                onToggleFinding={() => {
                                    if (selectedRouteId) {
                                        setFindingClientsForRoute(selectedRouteId, !isFindingOpen);
                                        refetchMatches();
                                    }
                                }}
                                matchedClients={matchedClients}
                                onInviteClient={async (clientRouteId, fare) => {
                                    if (selectedRouteId) {
                                        try {
                                            await invitePassenger({
                                                clientRouteId,
                                                driverRouteId: selectedRouteId,
                                                proposedPrice: fare
                                            });
                                            showToast('Invitation sent to passenger', 'success');
                                        } catch (err: any) {
                                            showToast(err?.message || 'Failed to send invitation', 'error');
                                        }
                                    }
                                }}
                                isInviting={isInviting}
                            />
                        )
                    )}

                    {!isFindingOpen && (
                        <DriverRouteSelector
                            routes={driverRoutes}
                            selectedRouteId={selectedRouteId}
                            onSelectRoute={handleSelectRoute}
                            onCreateRoute={() => router.push('/(driver)/add-route')}
                        />
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // User Location
    userLocationContainer: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
    },
    userDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#007AFF',
        borderWidth: 3,
        borderColor: '#fff',
        // Shadow
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6,
    },
    // Saved Places
    savedPlaceMarker: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#FFD700',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    savedPlaceInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    savedPlaceDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    // Route Endpoints
    routeEndpoint: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    routeEndpointInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
    // Client Markers
    clientMarker: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    clientMarkerInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
});
