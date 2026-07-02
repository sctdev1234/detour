import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Bell } from 'lucide-react-native';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DetourMap from '../../components/Map';
import TripCreationWizard from '../../components/trips/TripCreationWizard';
import TripCardsOverlay from '../../components/trips/TripCardsOverlay';
import ActiveTripTracker from '../../components/trips/ActiveTripTracker';
import { Colors } from '../../constants/theme';
import { useClientTrips, useCreateClientTrip, useClientRequests } from '../../hooks/api/useTripQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { useTrackingStore } from '../../store/useTrackingStore';
import { RouteService } from '../../services/RouteService';
import { LatLng, ClientTrip } from '../../types';
import { useRideStore } from '../../store/useRideStore';
import { useRideFlow } from '../../hooks/useRideFlow';
import OfferList from '../../components/trips/OfferList';

// V2 Imports
import { useDispatchFlow } from '../../hooks/useDispatchFlow';
import TripExperience from '../../components/dispatch/passenger/TripExperience';

type HomeState = 'zero_trips' | 'has_trips' | 'active_trip';

export default function ClientDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { user } = useAuthStore();
    const { status: rideStatus, offers } = useRideStore();
    const { showToast, setHideGlobalHeader, setHideGlobalFooter, featureFlags } = useUIStore();
    const { driverLocation } = useTrackingStore();

    // Data hooks
    const { data: clientTrips, isLoading } = useClientTrips();
    const { mutateAsync: createClientTrip, isPending: isCreating } = useCreateClientTrip();
    const { data: requests } = useClientRequests();

    // Local state
    const [currentLoc, setCurrentLoc] = useState<LatLng | null>(null);
    const [currentAddr, setCurrentAddr] = useState('Current Location');
    const [isCreatingTrip, setIsCreatingTrip] = useState(false);
    const [mapPoints, setMapPoints] = useState<LatLng[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<ClientTrip | null>(null);

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

    // ============================================
    // DETERMINE HOME STATE
    // ============================================
    const activeTrip = useMemo(() =>
        (clientTrips || []).find(t => t.status === 'active'),
        [clientTrips]
    );

    const homeState: HomeState = useMemo(() => {
        if (activeTrip) return 'active_trip';
        if (isCreatingTrip) return 'zero_trips'; // Manual trigger
        if (!clientTrips || clientTrips.length === 0) return 'zero_trips';
        return 'has_trips';
    }, [activeTrip, clientTrips, isCreatingTrip]);

    // ============================================
    // MAP CONFIGURATION BASED ON STATE
    // ============================================
    const mapMode = useMemo(() => {
        switch (homeState) {
            case 'zero_trips': return 'view';
            case 'has_trips': return 'view';
            case 'active_trip': return 'trip';
            default: return 'view';
        }
    }, [homeState]);

    // Map points for State 2 (show selected trip's route)
    const mapTripPoints = useMemo(() => {
        if (homeState === 'has_trips' && selectedTrip) {
            return [selectedTrip.startPoint, selectedTrip.endPoint];
        }
        if (homeState === 'zero_trips' && mapPoints.length > 0) {
            return mapPoints;
        }
        return undefined;
    }, [homeState, selectedTrip, mapPoints]);

    // Active trip data for map
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

    // ============================================
    // HANDLERS
    // ============================================
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
                    await requestRide(data.startPoint, data.endPoint, 'Pickup', 'Destination', data.price, 5000, 600); // Approximate distance/duration for now
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

    const handleTripSelect = useCallback((trip: ClientTrip) => {
        setSelectedTrip(trip);
    }, []);

    const handleTripDetails = useCallback((trip: ClientTrip) => {
        if (trip.tripId) {
            router.push({ pathname: '/modal', params: { type: 'trip_details', id: trip.tripId } });
        } else {
            // No matched trip yet — go to requests
            router.push('/(client)/requests');
        }
    }, [router]);

    const handleAddTrip = useCallback(() => {
        setIsCreatingTrip(true);
    }, []);

    // ============================================
    // RENDER
    // ============================================
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Full-screen Background Map */}
            <View style={StyleSheet.absoluteFillObject}>
                <DetourMap
                    mode={mapMode as any}
                    theme={theme}
                    initialPoints={mapTripPoints}
                    trip={mapTripData as any}
                    driverLocation={homeState === 'active_trip' ? (driverLocation || undefined) : undefined}
                    savedPlaces={user?.savedPlaces}
                    fullScreen={true}
                    height="100%"
                    interactive={true}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Dark gradient overlay for contrast */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
                    locations={[0, 0.35, 1]}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                />
            </View>

            {/* Floating Header — Always visible */}
            <BlurView intensity={30} tint="dark" style={[styles.headerFloating, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.push('/(client)/profile')} activeOpacity={0.8} style={styles.avatarButton}>
                        {user?.photoURL ? (
                            <Animated.Image source={{ uri: user.photoURL }} style={styles.profileAvatar} />
                        ) : (
                            <View style={[styles.profileAvatarFallback, { backgroundColor: theme.primary }]}>
                                <Text style={styles.avatarFallbackText}>{user?.fullName?.charAt(0).toUpperCase() || 'C'}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <View style={styles.greetingText}>
                        <Text style={styles.greetingTitle}>Salam,</Text>
                        <Text style={styles.greetingName}>{user?.fullName || 'Client'}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/(client)/requests')}
                        style={styles.notificationBtn}
                        activeOpacity={0.8}
                    >
                        <Bell size={22} color="#FFF" />
                        {pendingOffersCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.badgeText}>{pendingOffersCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </BlurView>

            {/* ========================================== */}
            {/* STATE 1: Zero trips — Creation Wizard      */}
            {/* ========================================== */}
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
                    /* "Where to?" prompt */
                    <View style={styles.whereToContainer}>
                        <Animated.View entering={FadeInDown.springify()}>
                            <BlurView
                                intensity={70}
                                tint={colorScheme === 'dark' ? 'dark' : 'light'}
                                style={[styles.whereToCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.95)' }]}
                            >
                                <Text style={[styles.whereToTitle, { color: theme.text }]}>
                                    Where are you going?
                                </Text>
                                <Text style={[styles.whereToSubtitle, { color: theme.textSecondary }]}>
                                    Create your daily commute and find a driver
                                </Text>
                                <TouchableOpacity
                                    style={[styles.whereToBtn, { backgroundColor: theme.primary }]}
                                    onPress={() => setIsCreatingTrip(true)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.whereToBtnText}>Set Up My Commute</Text>
                                </TouchableOpacity>
                            </BlurView>
                        </Animated.View>
                    </View>
                )
            )}

            {/* ========================================== */}
            {/* STATE 2: Has trips — Cards on map           */}
            {/* ========================================== */}
            {homeState === 'has_trips' && clientTrips && clientTrips.length > 0 && (
                <TripCardsOverlay
                    trips={clientTrips}
                    theme={theme}
                    colorScheme={colorScheme}
                    onTripSelect={handleTripSelect}
                    onTripDetails={handleTripDetails}
                    onAddTrip={handleAddTrip}
                />
            )}

            {/* ========================================== */}
            {/* STATE 3: Active trip — Live tracking         */}
            {/* ========================================== */}
            {homeState === 'active_trip' && activeTrip && (
                <ActiveTripTracker
                    trip={activeTrip}
                    theme={theme}
                    colorScheme={colorScheme}
                />
            )}

            {/* ========================================== */}
            {/* STATE 4: Searching / Offers Incoming         */}
            {/* ========================================== */}
            {featureFlags.enableV2Dispatch ? (
                // V2 Dispatch Flow
                (v2Flow.isSearching || v2Flow.hasOffers || v2Flow.isAssigned) && (
                    <View style={[styles.whereToContainer, { bottom: 0 }]}>
                        <TripExperience onClose={() => v2Flow.cancelSearch()} />
                    </View>
                )
            ) : (
                // V1 Dispatch Flow
                (rideStatus === 'SEARCHING' || rideStatus === 'OFFERS_OPEN') && (
                    <View style={[styles.whereToContainer, { bottom: 0 }]}>
                        <OfferList
                            offers={offers}
                            theme={theme}
                            isDark={colorScheme === 'dark'}
                            onAccept={acceptOffer}
                            onReject={rejectOffer}
                        />
                    </View>
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    // Floating Top Header
    headerFloating: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    avatarButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    profileAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    profileAvatarFallback: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    avatarFallbackText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    greetingText: {
        flex: 1,
        marginLeft: 12,
    },
    greetingTitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '500',
    },
    greetingName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    notificationBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
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
        borderColor: '#000',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    whereToContainer: {
        position: 'absolute',
        bottom: 75,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    whereToCard: {
        borderRadius: 28,
        padding: 28,
        alignItems: 'center',
        overflow: 'hidden',
    },
    whereToTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    whereToSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    whereToBtn: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        boxShadow: '0px 4px 16px rgba(0,102,255,0.3)',
    },
    whereToBtnText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});
