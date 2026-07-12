import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Marker, Polyline } from 'react-native-maps';

import DetourMap from '../../components/Map';
import TripCreationWizard from '../../components/trips/TripCreationWizard';
import ContextualBottomSheet from '../../components/passenger/home/ContextualBottomSheet';
import FloatingActionPanel from '../../components/passenger/home/FloatingActionPanel';
import SmartHeader from '../../components/passenger/home/SmartHeader';

import { CameraConfig, GradientConfig } from '../../constants/design';
import { Colors } from '../../constants/theme';
import { useClientRequests, useClientTrips, useCreateClientTrip } from '../../hooks/api/useTripQueries';
import { useDispatchFlow } from '../../hooks/useDispatchFlow';
import { RouteService } from '../../services/RouteService';
import { useAuthStore } from '../../store/useAuthStore';
import { dispatchActions } from '../../store/dispatchActions';
import { useTrackingStore } from '../../store/useTrackingStore';
import { useUIStore } from '../../store/useUIStore';
import { ClientTrip, LatLng } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';

type HomeState = 'idle' | 'searching' | 'active';

export default function ClientDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const { user } = useAuthStore();
    const { showToast, setHideGlobalHeader, setHideGlobalFooter } = useUIStore();
    const { driverLocation } = useTrackingStore();

    const { data: clientTrips } = useClientTrips();
    const { mutateAsync: createClientTrip, isPending: isCreating } = useCreateClientTrip();
    const { data: requests } = useClientRequests();
    const v2Flow = useDispatchFlow();

    const [currentLoc, setCurrentLoc] = useState<LatLng | null>(null);
    const [currentAddr, setCurrentAddr] = useState('Current Location');
    const [isCreatingTrip, setIsCreatingTrip] = useState(false);
    const [mapPoints, setMapPoints] = useState<LatLng[]>([]);

    const pendingOffersCount = useMemo(() =>
        (requests || []).filter((r: any) => r.status === 'pending' && r.initiatedBy === 'driver').length,
        [requests]
    );

    useEffect(() => {
        setHideGlobalHeader(true);
        setHideGlobalFooter(true);
        return () => {
            setHideGlobalHeader(false);
            setHideGlobalFooter(false);
        };
    }, []);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                
                let location;
                try {
                    location = await Location.getCurrentPositionAsync({});
                } catch (err) {
                    // Fallback to last known position if current position is unavailable
                    location = await Location.getLastKnownPositionAsync({});
                    if (!location) {
                        throw err; // Re-throw if no fallback available
                    }
                }
                
                const loc: LatLng = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
                setCurrentLoc(loc);
                const addr = await RouteService.reverseGeocode(loc.latitude, loc.longitude);
                setCurrentAddr(addr);
            } catch (error) {
                console.warn('Location services unavailable, defaulting to map view:', error);
            }
        })();
    }, []);

    // Recover dispatch state on mount (e.g. if client is already searching for drivers)
    useEffect(() => {
        dispatchActions.recoverState();
    }, []);

    const activeTrip = useMemo(() => (clientTrips || []).find(t => t.status === 'active'), [clientTrips]);

    const homeState: HomeState = useMemo(() => {
        if (v2Flow.status !== 'IDLE' || activeTrip) return 'active';
        if (isCreatingTrip) return 'searching';
        return 'idle';
    }, [activeTrip, isCreatingTrip, v2Flow.status]);

    const mapMode = useMemo(() => {
        if (homeState === 'active') return 'trip';
        if (homeState === 'searching' && mapPoints.length > 0) return 'interactive_routes';
        return 'view';
    }, [homeState, mapPoints]);

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
                await v2Flow.requestRide({
                    startPoint: {
                        type: 'Point',
                        coordinates: [data.startPoint.longitude, data.startPoint.latitude],
                        address: 'Current Location'
                    },
                    endPoint: {
                        type: 'Point',
                        coordinates: [data.endPoint.longitude, data.endPoint.latitude],
                        address: 'Destination'
                    },
                    schedulingStrategy: 'IMMEDIATE'
                });
                showToast('Looking for drivers...', 'success');
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
    }, [createClientTrip, showToast, v2Flow]);

    const mapRef = useRef<any>(null);

    const [wizardMapCenter, setWizardMapCenter] = useState<LatLng | null>(null);
    const [isWizardDragging, setIsWizardDragging] = useState(false);

    const handleRegionChange = useCallback((region: any, details?: { isGesture?: boolean }) => {
        if (details && details.isGesture === false) return;
        setIsWizardDragging(prev => {
            if (!prev) return true;
            return prev;
        });
    }, []);

    const handleRegionChangeComplete = useCallback((region: any) => {
        setWizardMapCenter({ latitude: region.latitude, longitude: region.longitude });
        setIsWizardDragging(false);
    }, []);

    const handleLocatePress = () => {
        if (currentLoc && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: currentLoc.latitude,
                longitude: currentLoc.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    const dynamicEdgePadding = useMemo(() => {
        const top = 140; // SmartHeader height + margin
        const left = 40;
        const right = 40;
        
        let bottom = 150; // Idle state bottom sheet
        if (isCreatingTrip) bottom = 450;
        else if (homeState === 'searching') bottom = 400;
        else if (homeState === 'active') bottom = 300;

        return { top, right, bottom, left };
    }, [isCreatingTrip, homeState]);

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={StyleSheet.absoluteFillObject}>
                <DetourMap
                    ref={mapRef}
                    mode={mapMode as any}
                    theme={theme}
                    initialPoints={mapPoints.length > 0 ? mapPoints : undefined}
                    driverLocation={homeState === 'active' ? (driverLocation || undefined) : undefined}
                    fullScreen={true}
                    height="100%"
                    interactive={true}
                    style={StyleSheet.absoluteFillObject}
                    edgePadding={dynamicEdgePadding}
                    onRegionChange={handleRegionChange}
                    onRegionChangeComplete={handleRegionChangeComplete}
                >
                    {isCreatingTrip && mapPoints.length === 2 && (
                        <>
                            <Marker coordinate={mapPoints[0]} pinColor="#10B981" />
                            <Marker coordinate={mapPoints[1]} pinColor="#FF3B30" />
                            <Polyline
                                coordinates={mapPoints}
                                strokeColor={theme.primary}
                                strokeWidth={4}
                            />
                        </>
                    )}
                </DetourMap>
                <LinearGradient
                    colors={GradientConfig.topColors as unknown as [string, string, ...string[]]}
                    locations={GradientConfig.topLocations as unknown as [number, number, ...number[]]}
                    style={[styles.topGradient, { height: GradientConfig.topHeight }]}
                    pointerEvents="none"
                />
            </View>

            <SmartHeader 
                homeState={homeState}
                pendingOffersCount={pendingOffersCount}
                currentAddress={currentAddr}
                driverStatusText={v2Flow.status === 'ASSIGNED' ? 'Driver Assigned' : (v2Flow.status === 'EN_ROUTE' ? 'Driver on the way' : undefined)}
            />

            <FloatingActionPanel 
                bottomOffset={isCreatingTrip ? 0 : 250} 
                onLocatePress={handleLocatePress}
                showAdd={homeState === 'idle'}
                onAddPress={() => setIsCreatingTrip(true)}
            />

            {isCreatingTrip ? (
                <View style={styles.wizardContainer} pointerEvents="box-none">
                    <TripCreationWizard
                        theme={theme}
                        colorScheme={colorScheme}
                        currentLocation={currentLoc}
                        currentAddress={currentAddr}
                        mapPoints={mapPoints}
                        onPointsChange={setMapPoints}
                        onCancel={() => setIsCreatingTrip(false)}
                        onConfirm={handleCreateTrip}
                        isSubmitting={isCreating}
                        mapCenter={wizardMapCenter}
                        isMapDragging={isWizardDragging}
                        mapRef={mapRef}
                    />
                </View>
            ) : (
                <ContextualBottomSheet 
                    homeState={homeState}
                    onSearchPress={() => setIsCreatingTrip(true)}
                    onHomePress={() => setIsCreatingTrip(true)}
                    onWorkPress={() => setIsCreatingTrip(true)}
                />
            )}
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
    },
    wizardContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
    }
});
