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
import DashboardMap from './DashboardMap';
import Animated, {
    Easing as REasing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useTrips } from '../../hooks/api/useTripQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useLocationStore } from '../../store/useLocationStore';
import { usePlacesStore } from '../../store/usePlacesStore';
import { decodePolyline } from '../../utils/location';
import { IN_PROGRESS_STATUSES } from '../../utils/timeUtils';
import DashboardBottomSheet from './DashboardBottomSheet';
import FloatingTopBar from './FloatingTopBar';
import QuickActions from './QuickActions';

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
    const { showSavedPlaces, showSavedRoutes, driverStatus } = useDashboardStore();

    const { data: allTrips } = useTrips();

    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

    // Filter trips for current driver
    const trips = allTrips?.filter((t: any) =>
        t.driverId?._id === user?.id ||
        t.driverId?.id === user?.id ||
        t.driverId === user?.id
    ) || [];

    // Active trip
    const activeTrip = trips.find((t: any) =>
        IN_PROGRESS_STATUSES.includes(t.status) || t.status === 'active'
    );

    // Find the primary trip to show on map (active or next scheduled)
    const tripToDisplay = React.useMemo(() => {
        if (activeTrip) return activeTrip;
        // Fallback to first non-completed trip
        return trips.find(t => 
            t.status?.toLowerCase() !== 'completed' && 
            t.status?.toLowerCase() !== 'cancelled'
        );
    }, [activeTrip, trips]);

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
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({});
            setCurrentLocation(loc);
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
    const userCoords = (trackedLocation && trackedLocation.coords.latitude !== 0 && trackedLocation.coords.longitude !== 0)
        ? { latitude: trackedLocation.coords.latitude, longitude: trackedLocation.coords.longitude }
        : (currentLocation && currentLocation.coords.latitude !== 0 && currentLocation.coords.longitude !== 0)
            ? { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude }
            : null;

    const routePolylines = React.useMemo(() => {
        return trips
            .filter((t: any) => {
                const isActive = IN_PROGRESS_STATUSES.includes(t.status) || t.status === 'active';
                const hasRoute = t.routeId?.routeGeometry || (t.routeId?.startPoint && t.routeId?.endPoint);
                return (isActive || showSavedRoutes) && hasRoute;
            })
            .map((t: any) => {
                const isActive = IN_PROGRESS_STATUSES.includes(t.status) || t.status === 'active';
                const r = t.routeId || {};

                const startP = (r.startPoint?.latitude !== undefined && r.startPoint.latitude !== 0 && r.startPoint.longitude !== 0) ? r.startPoint : null;
                const endP = (r.endPoint?.latitude !== undefined && r.endPoint.latitude !== 0 && r.endPoint.longitude !== 0) ? r.endPoint : null;

                let coords: any[] = [];
                if (r.routeGeometry) {
                    coords = decodePolyline(r.routeGeometry);
                } else if (startP && endP) {
                    coords = [
                        startP,
                        ...(r.waypoints || []).filter((wp: any) => wp?.latitude !== undefined),
                        endP,
                    ];
                }

                return {
                    id: t._id || t.id,
                    coords: coords.filter(p => p && typeof p.latitude === 'number' && p.latitude !== 0 && p.longitude !== 0),
                    isActive,
                    color: isActive
                        ? '#EF4444'
                        : colorScheme === 'dark'
                            ? 'rgba(79, 70, 229, 0.6)' // Increased opacity
                            : 'rgba(79, 70, 229, 0.5)', // Increased opacity
                    width: isActive ? 6 : 4, // Slightly thicker
                    startPoint: startP,
                    endPoint: endP,
                };
            });
    }, [trips, showSavedRoutes, colorScheme]);

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
            <DashboardMap
                ref={mapRef}
                initialRegion={DEFAULT_REGION}
                userCoords={userCoords}
                pulseStyle={pulseStyle}
                showSavedPlaces={showSavedPlaces}
                places={places}
                getSavedPlaceColor={getSavedPlaceColor}
                routePolylines={routePolylines}
                activeTrip={tripToDisplay}
                styles={styles}
                theme={theme}
            />

            {/* ===== FLOATING UI LAYERS ===== */}

            {/* Top Bar */}
            <FloatingTopBar onMenuPress={onMenuPress} />

            {/* Quick Actions (Right Side) */}
            <QuickActions
                onCenterMap={centerToMyLocation}
                onCreateRoute={() => router.push('/(driver)/add-route')}
            />

            {/* Bottom Sheet */}
            <DashboardBottomSheet />
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
