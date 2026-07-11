import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Bell, Briefcase, Home, Navigation, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    SlideInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DetourMap from '../../components/Map';
import ActiveTripTracker from '../../components/trips/ActiveTripTracker';
import OfferList from '../../components/trips/OfferList';
import TripCreationWizard from '../../components/trips/TripCreationWizard';
import {
    CameraConfig,
    EmptyStateDesign,
    FabDesign,
    GradientConfig,
    SearchBarDesign,
} from '../../constants/design';
import { Colors } from '../../constants/theme';
import { useClientRequests, useClientTrips, useCreateClientTrip } from '../../hooks/api/useTripQueries';
import { useRideFlow } from '../../hooks/useRideFlow';
import { RouteService } from '../../services/RouteService';
import { useAuthStore } from '../../store/useAuthStore';
import { useRideStore } from '../../store/useRideStore';
import { useTrackingStore } from '../../store/useTrackingStore';
import { useUIStore } from '../../store/useUIStore';
import { ClientTrip, LatLng } from '../../types';

// V2 Imports
import TripExperience from '../../components/dispatch/passenger/TripExperience';
import { useDispatchFlow } from '../../hooks/useDispatchFlow';

// ─── Home State ─────────────────────────────────────────────────────

type HomeState = 'zero_trips' | 'has_trips' | 'active_trip';

// ─── Component ──────────────────────────────────────────────────────

export default function ClientDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const { user } = useAuthStore();
    const { status: rideStatus, offers } = useRideStore();
    const { showToast, setHideGlobalHeader, setHideGlobalFooter, featureFlags } = useUIStore();
    const { driverLocation } = useTrackingStore();

    // ─── Data hooks (untouched) ─────────────────────────────────────
    const { data: clientTrips, isLoading } = useClientTrips();
    const { mutateAsync: createClientTrip, isPending: isCreating } = useCreateClientTrip();
    const { data: requests } = useClientRequests();

    // ─── Local state ────────────────────────────────────────────────
    const [currentLoc, setCurrentLoc] = useState<LatLng | null>(null);
    const [currentAddr, setCurrentAddr] = useState('Current Location');
    const [isCreatingTrip, setIsCreatingTrip] = useState(false);
    const [mapPoints, setMapPoints] = useState<LatLng[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<ClientTrip | null>(null);

    // Auto-select first trip on load if none selected
    useEffect(() => {
        if (clientTrips && clientTrips.length > 0 && !selectedTrip) {
            setSelectedTrip(clientTrips[0]);
        }
    }, [clientTrips, selectedTrip]);

    // Pending offers count
    const pendingOffersCount = useMemo(() =>
        (requests || []).filter((r: any) => r.status === 'pending' && r.initiatedBy === 'driver').length,
        [requests]
    );

    // Hide global header on mount
    useEffect(() => {
        setHideGlobalHeader(true);
        return () => setHideGlobalHeader(false);
    }, []);

    // Hide global footer when creating a trip
    useEffect(() => {
        if (isCreatingTrip) {
            setHideGlobalFooter(true);
        } else {
            setHideGlobalFooter(false);
        }
        return () => setHideGlobalFooter(false);
    }, [isCreatingTrip]);

    // Get current location
    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                let location = await Location.getCurrentPositionAsync({});
                const loc: LatLng = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
                setCurrentLoc(loc);
                const addr = await RouteService.reverseGeocode(loc.latitude, loc.longitude);
                setCurrentAddr(addr);
            } catch (error) {
                console.error('Error fetching current location:', error);
            }
        })();
    }, []);

    // ─── Determine home state ───────────────────────────────────────

    const activeTrip = useMemo(() =>
        (clientTrips || []).find(t => t.status === 'active'),
        [clientTrips]
    );

    const homeState: HomeState = useMemo(() => {
        if (activeTrip) return 'active_trip';
        if (isCreatingTrip) return 'zero_trips';
        if (!clientTrips || clientTrips.length === 0) return 'zero_trips';
        return 'has_trips';
    }, [activeTrip, clientTrips, isCreatingTrip]);

    // ─── Map configuration ─────────────────────────────────────────

    const mapMode = useMemo(() => {
        switch (homeState) {
            case 'zero_trips': return 'view';
            case 'has_trips': return 'interactive_routes';
            case 'active_trip': return 'trip';
            default: return 'view';
        }
    }, [homeState]);

    const mapTripPoints = useMemo(() => {
        if (homeState === 'has_trips' && selectedTrip) {
            return [selectedTrip.startPoint, selectedTrip.endPoint];
        }
        if (homeState === 'zero_trips' && mapPoints.length > 0) {
            return mapPoints;
        }
        return undefined;
    }, [homeState, selectedTrip, mapPoints]);

    const mapTripData = useMemo(() => {
        if (homeState === 'active_trip' && activeTrip?.tripId) {
            return {
                _id: activeTrip.tripId,
                routeId: {
                    startPoint: activeTrip.startPoint,
                    endPoint: activeTrip.endPoint,
                },
                status: activeTrip.tripStatus,
            };
        }
        return undefined;
    }, [homeState, activeTrip]);

    // Camera edge padding from design tokens
    const edgePadding = useMemo(() => {
        return selectedTrip ? CameraConfig.selectedPadding : CameraConfig.overviewPadding;
    }, [selectedTrip]);

    // ─── Handlers (all untouched) ───────────────────────────────────

    const handlePointsChange = useCallback(async (newPoints: LatLng[]) => {
        setMapPoints(newPoints);
    }, []);

    const { requestRide, acceptOffer, rejectOffer } = useRideFlow();
    const v2Flow = useDispatchFlow();

    const handleCreateTrip = useCallback(async (data: {
        startPoint: LatLng;
        endPoint: LatLng;
        days: string[];
        timeStart: string;
        price: number;
        rideType: 'immediate' | 'scheduled';
    }) => {
        try {
            if (data.rideType === 'immediate') {
                if (featureFlags.enableV2Dispatch) {
                    await v2Flow.requestRide({
                        pickup: {
                            type: 'Point',
                            coordinates: [data.startPoint.longitude, data.startPoint.latitude],
                            address: 'Current Location'
                        },
                        dropoff: {
                            type: 'Point',
                            coordinates: [data.endPoint.longitude, data.endPoint.latitude],
                            address: 'Destination'
                        }
                    });
                    showToast('Looking for drivers (V2)...', 'success');
                } else {
                    await requestRide(data.startPoint, data.endPoint, 'Pickup', 'Destination', data.price, 5000, 600);
                    showToast('Looking for drivers...', 'success');
                }
                setIsCreatingTrip(false);
                setMapPoints([]);
            } else {
                await createClientTrip(data);
                showToast('Scheduled trip created! Looking for drivers...', 'success');
                setIsCreatingTrip(false);
                setMapPoints([]);
            }
        } catch (error: any) {
            console.error(error);
            showToast(error.response?.data?.msg || 'Failed to create trip', 'error');
        }
    }, [createClientTrip, showToast, requestRide]);

    const handleCancelCreation = useCallback(() => {
        setIsCreatingTrip(false);
        setMapPoints([]);
    }, []);

    const handleTripDetails = useCallback((trip: ClientTrip) => {
        if (trip.tripId) {
            router.push({ pathname: '/modal', params: { type: 'trip_details', id: trip.tripId } });
        } else {
            router.push('/(client)/requests');
        }
    }, [router]);

    const handleRoutePress = useCallback((trip: ClientTrip) => {
        if (selectedTrip?.id === trip.id) return;
        setSelectedTrip(trip);
    }, [selectedTrip]);

    const handleAnnotationPress = useCallback((trip: ClientTrip) => {
        if (selectedTrip?.id === trip.id) {
            handleTripDetails(trip);
        } else {
            setSelectedTrip(trip);
        }
    }, [selectedTrip, handleTripDetails]);

    const handleMapPress = useCallback(() => {
        setSelectedTrip(null);
    }, []);

    const handleAddTrip = useCallback(() => {
        setIsCreatingTrip(true);
    }, []);

    // ─── FAB press animation ────────────────────────────────────────

    const fabScale = useSharedValue(1);
    const fabAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: fabScale.value }],
    }));

    const handleFabPressIn = useCallback(() => {
        fabScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    }, [fabScale]);

    const handleFabPressOut = useCallback(() => {
        fabScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, [fabScale]);

    // ─── Render ─────────────────────────────────────────────────────

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ─── Full-screen map ─── */}
            <View style={StyleSheet.absoluteFillObject}>
                <DetourMap
                    mode={mapMode as any}
                    theme={theme}
                    initialPoints={mapTripPoints}
                    interactiveTrips={homeState === 'has_trips' ? clientTrips : []}
                    selectedRouteId={selectedTrip?.id}
                    onRoutePress={handleRoutePress}
                    onAnnotationPress={handleAnnotationPress}
                    onMapPress={handleMapPress}
                    trip={mapTripData as any}
                    driverLocation={homeState === 'active_trip' ? (driverLocation || undefined) : undefined}
                    savedPlaces={user?.savedPlaces}
                    fullScreen={true}
                    height="100%"
                    interactive={true}
                    style={StyleSheet.absoluteFillObject}
                    edgePadding={edgePadding}
                />

                <LinearGradient
                    colors={GradientConfig.topColors as unknown as [string, string, ...string[]]}
                    locations={GradientConfig.topLocations as unknown as [number, number, ...number[]]}
                    style={[styles.topGradient, { height: GradientConfig.topHeight }]}
                    pointerEvents="none"
                />

                {/* Bottom gradient — smooth three-stop fade */}
                <LinearGradient
                    colors={GradientConfig.bottomColors as unknown as [string, string, ...string[]]}
                    locations={GradientConfig.bottomLocations as unknown as [number, number, ...number[]]}
                    style={[styles.bottomGradient, { height: GradientConfig.bottomHeight }]}
                    pointerEvents="none"
                />
            </View>

            {/* ─── Search bar (State 0 + State 2) ─── */}
            {(homeState === 'zero_trips' || homeState === 'has_trips') && !isCreatingTrip && (
                <Animated.View
                    entering={FadeInDown.springify().damping(18).delay(80)}
                    style={[styles.searchContainer, { top: insets.top + 12 }]}
                >
                    <View
                        style={[
                            styles.searchBar,
                            { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' },
                            SearchBarDesign.shadow,
                        ]}
                        accessibilityRole="search"
                    >
                        {/* Avatar */}
                        <TouchableOpacity
                            onPress={() => router.push('/(client)/profile')}
                            activeOpacity={0.8}
                            style={styles.avatarBtn}
                            accessibilityLabel="Open profile"
                            accessibilityRole="button"
                        >
                            {user?.photoURL ? (
                                <Animated.Image source={{ uri: user.photoURL }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
                                    <Text style={styles.avatarText}>
                                        {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Search input area */}
                        <TouchableOpacity
                            style={styles.searchInputArea}
                            activeOpacity={0.7}
                            onPress={() => setIsCreatingTrip(true)}
                            accessibilityLabel="Search destination"
                            accessibilityRole="button"
                        >
                            <Text
                                style={[
                                    styles.searchPlaceholder,
                                    { color: isDark ? '#A0A0A0' : '#8E8E93' },
                                ]}
                            >
                                Where are you going?
                            </Text>
                        </TouchableOpacity>

                        {/* Notification bell */}
                        <TouchableOpacity
                            onPress={() => router.push('/(client)/requests')}
                            style={[
                                styles.bellBtn,
                                { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' },
                            ]}
                            activeOpacity={0.8}
                            accessibilityLabel={
                                pendingOffersCount > 0
                                    ? `${pendingOffersCount} pending offers`
                                    : 'Notifications'
                            }
                            accessibilityRole="button"
                        >
                            <Bell size={SearchBarDesign.bellIconSize} color={theme.text} />
                            {pendingOffersCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{pendingOffersCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {/* ─── State 0: Empty state / Trip creation ─── */}
            {homeState === 'zero_trips' && (
                isCreatingTrip ? (
                    <TripCreationWizard
                        theme={theme}
                        colorScheme={colorScheme}
                        currentLocation={currentLoc}
                        currentAddress={currentAddr}
                        mapPoints={mapPoints}
                        onPointsChange={handlePointsChange}
                        onCancel={handleCancelCreation}
                        onConfirm={handleCreateTrip}
                        isSubmitting={isCreating}
                    />
                ) : (
                    <Animated.View
                        entering={SlideInDown.springify().damping(20)}
                        style={[styles.emptyStateContainer, { bottom: insets.bottom + 24 }]}
                    >
                        <View
                            style={[
                                styles.emptyStateCard,
                                { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' },
                                SearchBarDesign.shadow,
                            ]}
                        >
                            <View
                                style={[
                                    styles.emptyStateIconWrap,
                                    { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' },
                                ]}
                            >
                                <Navigation size={28} color={theme.primary} />
                            </View>

                            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                                Where are you commuting today?
                            </Text>

                            <View style={styles.quickActions}>
                                <TouchableOpacity
                                    style={[
                                        styles.quickChip,
                                        { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' },
                                    ]}
                                    onPress={() => setIsCreatingTrip(true)}
                                    activeOpacity={0.7}
                                    accessibilityLabel="Set home as destination"
                                    accessibilityRole="button"
                                >
                                    <Home size={18} color={theme.text} style={styles.quickChipIcon} />
                                    <Text style={[styles.quickChipText, { color: theme.text }]}>
                                        Home
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.quickChip,
                                        { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' },
                                    ]}
                                    onPress={() => setIsCreatingTrip(true)}
                                    activeOpacity={0.7}
                                    accessibilityLabel="Set work as destination"
                                    accessibilityRole="button"
                                >
                                    <Briefcase size={18} color={theme.text} style={styles.quickChipIcon} />
                                    <Text style={[styles.quickChipText, { color: theme.text }]}>
                                        Work
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.ctaBtn, { backgroundColor: theme.primary }]}
                                onPress={() => setIsCreatingTrip(true)}
                                activeOpacity={0.85}
                                accessibilityLabel="Create a commute"
                                accessibilityRole="button"
                            >
                                <Text style={styles.ctaBtnText}>Create Commute</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )
            )}

            {/* ─── State 2: Route browsing — FAB ─── */}
            {homeState === 'has_trips' && clientTrips && clientTrips.length > 0 && (
                <Animated.View
                    entering={SlideInDown.springify().damping(20).delay(200)}
                    style={[
                        styles.fabContainer,
                        { bottom: insets.bottom + 24 },
                    ]}
                >
                    <Animated.View style={fabAnimatedStyle}>
                        <TouchableOpacity
                            style={[
                                styles.fab,
                                { backgroundColor: theme.primary },
                                FabDesign.shadow,
                            ]}
                            onPress={handleAddTrip}
                            onPressIn={handleFabPressIn}
                            onPressOut={handleFabPressOut}
                            activeOpacity={1}
                            accessibilityLabel="Plan a new commute"
                            accessibilityRole="button"
                        >
                            <Plus size={18} color="#FFFFFF" style={styles.fabIcon} />
                            <Text style={styles.fabText}>Plan Commute</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            )}

            {/* ─── State 3: Active trip ─── */}
            {homeState === 'active_trip' && activeTrip && (
                <ActiveTripTracker
                    trip={activeTrip}
                    theme={theme}
                    colorScheme={colorScheme}
                />
            )}

            {/* ─── State 4: Dispatch flow ─── */}
            {featureFlags.enableV2Dispatch ? (
                (v2Flow.isSearching || v2Flow.hasOffers || v2Flow.isAssigned) && (
                    <View style={[styles.dispatchContainer, { bottom: 0 }]}>
                        <TripExperience onClose={() => v2Flow.cancelSearch()} />
                    </View>
                )
            ) : (
                (rideStatus === 'SEARCHING' || rideStatus === 'OFFERS_OPEN') && (
                    <View style={[styles.dispatchContainer, { bottom: 0 }]}>
                        <OfferList
                            offers={offers}
                            theme={theme}
                            isDark={isDark}
                            onAccept={acceptOffer}
                            onReject={rejectOffer}
                        />
                    </View>
                )
            )}
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },

    // Gradients
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 5,
    },

    // Search bar
    searchContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: SearchBarDesign.height,
        borderRadius: SearchBarDesign.borderRadius,
        paddingHorizontal: 8,
    },
    avatarBtn: {
        padding: 4,
    },
    avatar: {
        width: SearchBarDesign.avatarSize,
        height: SearchBarDesign.avatarSize,
        borderRadius: SearchBarDesign.avatarSize / 2,
    },
    avatarFallback: {
        width: SearchBarDesign.avatarSize,
        height: SearchBarDesign.avatarSize,
        borderRadius: SearchBarDesign.avatarSize / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    searchInputArea: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    searchPlaceholder: {
        fontSize: SearchBarDesign.placeholderFontSize,
        fontWeight: '600',
    },
    bellBtn: {
        width: SearchBarDesign.bellSize,
        height: SearchBarDesign.bellSize,
        borderRadius: SearchBarDesign.bellSize / 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 2,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#FF3B30',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },

    // Empty state
    emptyStateContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 15,
    },
    emptyStateCard: {
        borderRadius: EmptyStateDesign.cardBorderRadius,
        padding: EmptyStateDesign.cardPadding,
        alignItems: 'center',
    },
    emptyStateIconWrap: {
        width: EmptyStateDesign.iconWrapperSize,
        height: EmptyStateDesign.iconWrapperSize,
        borderRadius: EmptyStateDesign.iconWrapperSize / 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: EmptyStateDesign.titleFontSize,
        fontWeight: EmptyStateDesign.titleFontWeight,
        letterSpacing: -0.4,
        marginBottom: 8,
        textAlign: 'center',
    },
    quickActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        gap: 12,
    },
    quickChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: EmptyStateDesign.chipPaddingH,
        paddingVertical: EmptyStateDesign.chipPaddingV,
        borderRadius: EmptyStateDesign.chipBorderRadius,
    },
    quickChipIcon: {
        marginRight: 6,
    },
    quickChipText: {
        fontSize: EmptyStateDesign.chipFontSize,
        fontWeight: EmptyStateDesign.chipFontWeight,
    },
    ctaBtn: {
        width: '100%',
        height: EmptyStateDesign.ctaHeight,
        borderRadius: EmptyStateDesign.ctaBorderRadius,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaBtnText: {
        color: '#FFFFFF',
        fontSize: EmptyStateDesign.ctaFontSize,
        fontWeight: EmptyStateDesign.ctaFontWeight,
    },

    // FAB
    fabContainer: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 15,
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: FabDesign.height,
        paddingHorizontal: FabDesign.paddingHorizontal,
        borderRadius: FabDesign.borderRadius,
    },
    fabIcon: {
        marginRight: 8,
    },
    fabText: {
        color: '#FFFFFF',
        fontSize: FabDesign.fontSize,
        fontWeight: FabDesign.fontWeight,
    },

    // Dispatch
    dispatchContainer: {
        position: 'absolute',
        bottom: 75,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
});
