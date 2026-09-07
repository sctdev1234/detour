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
import { DriverOfferToast, OfferNotificationData } from '../../components/passenger/home/DriverOfferToast';

import { CameraConfig, GradientConfig } from '../../constants/design';
import { Colors } from '../../constants/theme';
import { useClientRequests, useClientTrips, useCreateClientTrip, useRoutes, useRemoveRoute } from '../../hooks/api/useTripQueries';
import { useDispatchFlow } from '../../hooks/useDispatchFlow';
import { RouteService } from '../../services/RouteService';
import { dispatchSocket } from '../../services/dispatchSocket';
import { useAuthStore } from '../../store/useAuthStore';
import { dispatchActions } from '../../store/dispatchActions';
import { extractOfferRouteId } from '../../store/useDispatchStore';
import { useTrackingStore } from '../../store/useTrackingStore';
import { useUIStore } from '../../store/useUIStore';
import { ClientTrip, LatLng, Route } from '../../types';
import { decodePolyline } from '../../utils/location';
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
    const { data: allRoutes } = useRoutes();
    const { mutateAsync: removeRoute, isPending: isDeletingRoute } = useRemoveRoute();
    const { mutateAsync: createClientTrip, isPending: isCreating } = useCreateClientTrip();
    const { data: requests } = useClientRequests();
    const v2Flow = useDispatchFlow();

    // Client's personal routes
    const clientRoutes = useMemo(() => {
        return (allRoutes || []).filter((r: Route) =>
            r.role === 'client' || r.userId === user?.id || (r.userId as any)?._id === user?.id
        );
    }, [allRoutes, user?.id]);

    // Selected route state (independent from active dispatch session)
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
    const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
    const [offerNotification, setOfferNotification] = useState<OfferNotificationData | null>(null);

    const selectedRoute = useMemo(() => {
        if (!selectedRouteId) return null;
        return clientRoutes.find(r => r.id === selectedRouteId) || null;
    }, [clientRoutes, selectedRouteId]);

    // Route-scoped finding drivers lifecycle state
    const isSelectedRouteFinding = useMemo(() => {
        if (!selectedRoute) return false;
        return !!(
            v2Flow.findingRouteIds[selectedRoute.id] ||
            (v2Flow.offersByRoute[selectedRoute.id] && v2Flow.offersByRoute[selectedRoute.id].length > 0) ||
            selectedRoute.status === 'searching' ||
            selectedRoute.status === 'pending' ||
            selectedRoute.status === 'active'
        );
    }, [selectedRoute, v2Flow.findingRouteIds, v2Flow.offersByRoute]);

    const isSelectedRouteDismissed = useMemo(() => {
        if (!selectedRoute) return false;
        return !!v2Flow.dismissedPanelRouteIds[selectedRoute.id];
    }, [selectedRoute, v2Flow.dismissedPanelRouteIds]);

    const selectedRouteOffers = useMemo(() => {
        if (!selectedRoute) return [];
        return v2Flow.offersByRoute[selectedRoute.id] || [];
    }, [selectedRoute, v2Flow.offersByRoute]);

    const handleSelectRoute = useCallback((routeId: string) => {
        setSelectedRouteId(prev => {
            if (prev === routeId) {
                v2Flow.setActiveDriverRoute(null);
                setSelectedOfferId(null);
                return null;
            }
            v2Flow.dismissPanelForRoute(routeId, false);
            v2Flow.setActiveDriverRoute(null);
            setSelectedOfferId(null);

            const r = clientRoutes.find(cr => cr.id === routeId);
            if (r?.startPoint && mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: r.startPoint.latitude,
                    longitude: r.startPoint.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }, 800);
            }
            return routeId;
        });
    }, [clientRoutes, v2Flow]);

    const handleCloseFindingPanel = useCallback(() => {
        if (selectedRouteId) {
            v2Flow.dismissPanelForRoute(selectedRouteId, true);
            v2Flow.setActiveDriverRoute(null);
            setSelectedOfferId(null);
        }
    }, [selectedRouteId, v2Flow]);

    const handleOpenFindingPanel = useCallback(() => {
        if (selectedRouteId) {
            v2Flow.dismissPanelForRoute(selectedRouteId, false);
        }
    }, [selectedRouteId, v2Flow]);

    const handleAcceptOffer = useCallback(async (offerId: string) => {
        setIsAcceptingOffer(true);
        try {
            await v2Flow.acceptOffer(offerId);
            showToast('Offer accepted! Driver assigned.', 'success');
            if (selectedRouteId) {
                v2Flow.setFindingForRoute(selectedRouteId, false);
            }
        } catch (err: any) {
            showToast(err?.message || 'Failed to accept offer', 'error');
        } finally {
            setIsAcceptingOffer(false);
        }
    }, [selectedRouteId, v2Flow, showToast]);

    const handleHoverOffer = useCallback((offer: any | null) => {
        if (!offer) {
            setSelectedOfferId(null);
            v2Flow.setActiveDriverRoute(null);
            return;
        }
        setSelectedOfferId(offer._id);
        const geom = offer.routeInfo?.driverRouteGeometry || offer.driverRouteGeometry;
        if (geom) {
            v2Flow.setActiveDriverRoute({
                id: offer.routeInfo?.driverRouteId || `driver-${offer._id}`,
                geometry: geom,
                startPoint: offer.routeInfo?.driverStartPoint,
                endPoint: offer.routeInfo?.driverEndPoint,
                driverName: offer.driverId?.fullName
            });
        }
    }, [v2Flow]);

    const handleViewNotification = useCallback((routeId: string, offer: any) => {
        let target = clientRoutes.find(r => r.id === routeId);
        if (!target && routeId) {
            target = clientRoutes.find(r => (r as any)._id === routeId);
        }
        const finalRouteId = target ? target.id : routeId;

        setSelectedRouteId(finalRouteId);
        if (finalRouteId) {
            v2Flow.setFindingForRoute(finalRouteId, true);
            v2Flow.dismissPanelForRoute(finalRouteId, false);
        }

        if (target?.startPoint && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: target.startPoint.latitude,
                longitude: target.startPoint.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
        }

        if (offer?.routeInfo?.driverRouteGeometry) {
            v2Flow.setActiveDriverRoute({
                id: offer.routeInfo.driverRouteId || `driver-${offer._id}`,
                geometry: offer.routeInfo.driverRouteGeometry,
                startPoint: offer.routeInfo.driverStartPoint,
                endPoint: offer.routeInfo.driverEndPoint,
                driverName: offer.driverId?.fullName
            });
        }

        setOfferNotification(null);
    }, [clientRoutes, v2Flow]);

    // Socket: route-isolated offer notifications
    useEffect(() => {
        const unsubscribe = dispatchSocket.onOfferReceived((offer: any) => {
            let targetRouteId = extractOfferRouteId(offer);
            if (!targetRouteId) {
                targetRouteId = selectedRouteId || clientRoutes.find(r => r.status === 'pending' || r.status === 'active')?.id || null;
            }
            if (targetRouteId) {
                offer.clientRouteId = targetRouteId;
                if (!offer.metadata) offer.metadata = {};
                offer.metadata.clientRouteId = targetRouteId;
            }

            v2Flow.addOffer(offer);

            if (targetRouteId) {
                v2Flow.setFindingForRoute(targetRouteId, true);
                v2Flow.dismissPanelForRoute(targetRouteId, false);
            }

            // Show top toast if client is not actively looking at this route
            if (selectedRouteId !== targetRouteId) {
                const driver = typeof offer.driverId === 'object' && offer.driverId !== null ? offer.driverId : (offer.driver || {});
                const dName = driver.fullName || (driver.firstName ? `${driver.firstName} ${driver.lastName || ''}` : (offer.driverName || 'Driver'));
                const dest = offer.routeInfo?.destination?.address || offer.metadata?.destination?.address || 'your destination';
                setOfferNotification({
                    id: offer._id,
                    routeId: targetRouteId || '',
                    tripInstanceId: offer.tripInstanceId,
                    driverName: dName,
                    destination: dest,
                    price: offer.counterPrice || offer.price,
                    offer
                });
            }
        });
        return () => {
            unsubscribe();
        };
    }, [selectedRouteId, v2Flow]);

    const handleDeleteSelectedRoute = useCallback(async (routeId: string) => {
        try {
            await removeRoute(routeId);
            showToast('Route deleted', 'success');
            setSelectedRouteId(null);
            v2Flow.setActiveDriverRoute(null);
        } catch (err: any) {
            showToast(err?.message || 'Failed to delete route', 'error');
        }
    }, [removeRoute, showToast, v2Flow]);

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

    const [lastRequestedRoute, setLastRequestedRoute] = useState<{ startPoint?: LatLng; endPoint?: LatLng } | null>(null);

    const dispatchRoute = useMemo(() => {
        const item = v2Flow.tripInstance || v2Flow.assignment;
        if (item) {
            const getPt = (p: any): LatLng | undefined => {
                if (!p) return undefined;
                if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
                    return { latitude: p.latitude, longitude: p.longitude };
                }
                if (Array.isArray(p.coordinates) && p.coordinates.length >= 2) {
                    return { latitude: p.coordinates[1], longitude: p.coordinates[0] };
                }
                return undefined;
            };
            const start = getPt(item.pickup || item.startPoint);
            const end = getPt(item.destination || item.endPoint);
            if (start && end) return { startPoint: start, endPoint: end };
        }
        if (lastRequestedRoute?.startPoint && lastRequestedRoute?.endPoint) {
            return lastRequestedRoute;
        }
        if (mapPoints.length >= 2) {
            return { startPoint: mapPoints[0], endPoint: mapPoints[mapPoints.length - 1] };
        }
        return { startPoint: undefined, endPoint: undefined };
    }, [v2Flow.tripInstance, v2Flow.assignment, lastRequestedRoute, mapPoints]);

    const activeTrip = useMemo(() => (clientTrips || []).find(t => t.status === 'active' || (t as any).status === 'searching'), [clientTrips]);

    const isSearching = v2Flow.status === 'OFFERS_OPEN' || (v2Flow.status as any) === 'SEARCHING' || (v2Flow.status as any) === 'WAITING_FOR_OFFERS' || activeTrip?.status === 'searching';
    const isAssigned = v2Flow.status === 'ASSIGNED' || v2Flow.status === 'EN_ROUTE' || activeTrip?.status === 'active';

    const homeState: HomeState = useMemo(() => {
        if (isAssigned) return 'active';
        if (isSearching || isCreatingTrip) return 'searching';
        if (v2Flow.status !== 'IDLE') return 'searching';
        return 'idle';
    }, [isAssigned, isSearching, isCreatingTrip, v2Flow.status]);

    const mapMode = useMemo(() => {
        if (homeState === 'active') {
            if (activeTrip) return 'trip';
            if (dispatchRoute.startPoint && dispatchRoute.endPoint) return 'route';
            return 'trip';
        }
        if (homeState === 'searching') {
            if (dispatchRoute.startPoint && dispatchRoute.endPoint) return 'route';
            if (mapPoints.length > 0) return 'interactive_routes';
            return 'view';
        }
        return 'view';
    }, [homeState, activeTrip, dispatchRoute, mapPoints]);

    // Format all client routes into polylines for simultaneous map rendering
    const routePolylines = useMemo(() => {
        const polylines: any[] = clientRoutes.map((r: Route) => {
            const startP = (r.startPoint?.latitude !== undefined && r.startPoint.latitude !== 0 && r.startPoint.longitude !== 0) ? r.startPoint : null;
            const endP = (r.endPoint?.latitude !== undefined && r.endPoint.latitude !== 0 && r.endPoint.longitude !== 0) ? r.endPoint : null;

            let coords: LatLng[] = [];
            if (r.routeGeometry) {
                coords = decodePolyline(r.routeGeometry);
            } else if (startP && endP) {
                coords = [
                    startP,
                    ...(r.waypoints || []).filter((wp: any) => wp?.latitude !== undefined),
                    endP,
                ];
            }

            const isSelected = selectedRouteId === r.id;
            const isActive = r.status === 'active';

            return {
                id: r.id,
                coords: coords.filter(p => p && typeof p.latitude === 'number' && p.latitude !== 0 && p.longitude !== 0),
                isActive,
                isSelected,
                color: isSelected
                    ? theme.primary
                    : (isDark ? 'rgba(99, 102, 241, 0.75)' : 'rgba(79, 70, 229, 0.65)'),
                width: isSelected ? 6 : 4,
                startPoint: startP,
                endPoint: endP,
            };
        });

        // If an active or candidate driver route is selected / previewed, add it to polylines
        if (v2Flow.activeDriverRoute && v2Flow.activeDriverRoute.geometry) {
            let driverCoords: LatLng[] = [];
            if (typeof v2Flow.activeDriverRoute.geometry === 'string') {
                driverCoords = decodePolyline(v2Flow.activeDriverRoute.geometry);
            } else if (Array.isArray(v2Flow.activeDriverRoute.geometry)) {
                driverCoords = v2Flow.activeDriverRoute.geometry;
            }
            if (driverCoords.length > 0) {
                polylines.push({
                    id: v2Flow.activeDriverRoute.id || 'driver-corridor-route',
                    coords: driverCoords.filter((p: any) => p && typeof p.latitude === 'number' && p.latitude !== 0 && p.longitude !== 0),
                    isActive: true,
                    isSelected: false,
                    isDriverRoute: true,
                    color: '#F59E0B',
                    width: 5,
                    startPoint: v2Flow.activeDriverRoute.startPoint,
                    endPoint: v2Flow.activeDriverRoute.endPoint
                });
            }
        }

        return polylines;
    }, [clientRoutes, selectedRouteId, theme.primary, isDark, v2Flow.activeDriverRoute]);

    const handleCreateTrip = useCallback(async (data: {
        startPoint: LatLng;
        endPoint: LatLng;
        days: string[];
        timeStart: string;
        price: number;
        rideType: 'immediate' | 'scheduled';
    }) => {
        try {
            let startAddress = data.startPoint.address;
            if (!startAddress || startAddress === 'Pickup' || startAddress === 'Current Location') {
                try {
                    const resolved = await RouteService.reverseGeocode(data.startPoint.latitude, data.startPoint.longitude);
                    if (resolved) startAddress = resolved;
                } catch {}
            }
            let endAddress = data.endPoint.address;
            if (!endAddress || endAddress === 'Destination') {
                try {
                    const resolved = await RouteService.reverseGeocode(data.endPoint.latitude, data.endPoint.longitude);
                    if (resolved) endAddress = resolved;
                } catch {}
            }

            const enrichedStartPoint = {
                ...data.startPoint,
                address: startAddress || data.startPoint.address || 'Pickup'
            };
            const enrichedEndPoint = {
                ...data.endPoint,
                address: endAddress || data.endPoint.address || 'Destination'
            };

            setLastRequestedRoute({ startPoint: enrichedStartPoint, endPoint: enrichedEndPoint });

            // 1. Create client route document so it appears on map and has canonical route identity
            const createdTrip = await createClientTrip({
                startPoint: enrichedStartPoint,
                endPoint: enrichedEndPoint,
                days: data.days.length > 0 ? data.days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                timeStart: data.timeStart || new Date().toTimeString().slice(0, 5),
                price: data.price
            });

            const newRouteId = createdTrip?.id || (createdTrip as any)?.routeId;

            // 2. Select this route and immediately activate its finding drivers lifecycle
            if (newRouteId) {
                setSelectedRouteId(newRouteId);
                v2Flow.setFindingForRoute(newRouteId, true);
                v2Flow.dismissPanelForRoute(newRouteId, false);
            }

            // 3. Request dispatch session with clientRouteId in metadata
            try {
                await v2Flow.requestRide({
                    startPoint: {
                        type: 'Point',
                        coordinates: [enrichedStartPoint.longitude, enrichedStartPoint.latitude],
                        address: enrichedStartPoint.address
                    },
                    endPoint: {
                        type: 'Point',
                        coordinates: [enrichedEndPoint.longitude, enrichedEndPoint.latitude],
                        address: enrichedEndPoint.address
                    },
                    schedulingStrategy: 'IMMEDIATE',
                    price: data.price,
                    metadata: { clientRouteId: newRouteId, price: data.price }
                });
            } catch (dispatchErr) {
                console.warn('Dispatcher request note:', dispatchErr);
            }

            showToast('Route created! Finding drivers along your corridor...', 'success');
            setIsCreatingTrip(false);
            setMapPoints([]);
        } catch (error: any) {
            console.error('Failed to create trip:', error);
            showToast(error.response?.data?.error || error.response?.data?.msg || error.message || 'Failed to create trip', 'error');
        }
    }, [createClientTrip, showToast, v2Flow]);

    const mapRef = useRef<any>(null);

    const [wizardMapCenter, setWizardMapCenter] = useState<LatLng | null>(currentLoc);
    const [isWizardDragging, setIsWizardDragging] = useState(false);

    useEffect(() => {
        if (!wizardMapCenter && currentLoc) {
            setWizardMapCenter(currentLoc);
        }
    }, [currentLoc]);

    const handleRegionChange = useCallback((region: any, details?: { isGesture?: boolean }) => {
        if (details && details.isGesture === false) return;
        setIsWizardDragging(prev => {
            if (!prev) return true;
            return prev;
        });
    }, []);

    const handleRegionChangeComplete = useCallback((region: any) => {
        if (region && typeof region.latitude === 'number' && typeof region.longitude === 'number') {
            setWizardMapCenter({ latitude: region.latitude, longitude: region.longitude });
        }
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
        else if (selectedRoute) {
            if (isSelectedRouteFinding && !isSelectedRouteDismissed) {
                bottom = 440;
            } else {
                bottom = 380;
            }
        }
        else if (homeState === 'searching') bottom = 400;
        else if (homeState === 'active') bottom = 300;

        return { top, right, bottom, left };
    }, [isCreatingTrip, selectedRoute, isSelectedRouteFinding, isSelectedRouteDismissed, homeState]);

    const initialMapPoints = useMemo(() => {
        if (isCreatingTrip && mapPoints.length > 0) return mapPoints;
        return undefined;
    }, [isCreatingTrip, mapPoints]);

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Top Notification Toast for Incoming Offers */}
            <DriverOfferToast
                notification={offerNotification}
                onView={handleViewNotification}
                onDismiss={() => setOfferNotification(null)}
            />

            <View style={StyleSheet.absoluteFillObject}>
                <DetourMap
                    ref={mapRef}
                    mode={mapMode as any}
                    theme={theme}
                    trip={activeTrip as any}
                    startPoint={dispatchRoute.startPoint}
                    endPoint={dispatchRoute.endPoint}
                    initialPoints={initialMapPoints}
                    driverLocation={homeState === 'active' ? (driverLocation || undefined) : undefined}
                    fullScreen={true}
                    height="100%"
                    interactive={true}
                    style={StyleSheet.absoluteFillObject}
                    edgePadding={dynamicEdgePadding}
                    routePolylines={routePolylines}
                    selectedRouteId={selectedRouteId}
                    onRouteSelect={handleSelectRoute}
                    onRegionChange={handleRegionChange}
                    onRegionChangeComplete={handleRegionChangeComplete}
                />
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
                bottomOffset={isCreatingTrip ? 0 : (selectedRoute ? (isSelectedRouteFinding && !isSelectedRouteDismissed ? 380 : 320) : 250)} 
                onLocatePress={handleLocatePress}
                showAdd={!isCreatingTrip}
                onAddPress={() => {
                    setSelectedRouteId(null);
                    setIsCreatingTrip(true);
                }}
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
                    onSearchPress={() => {
                        setSelectedRouteId(null);
                        setIsCreatingTrip(true);
                    }}
                    onHomePress={() => {
                        setSelectedRouteId(null);
                        setIsCreatingTrip(true);
                    }}
                    onWorkPress={() => {
                        setSelectedRouteId(null);
                        setIsCreatingTrip(true);
                    }}
                    selectedRoute={selectedRoute}
                    onDeselectRoute={() => {
                        setSelectedRouteId(null);
                        v2Flow.setActiveDriverRoute(null);
                        setSelectedOfferId(null);
                    }}
                    onDeleteRoute={handleDeleteSelectedRoute}
                    isDeletingRoute={isDeletingRoute}
                    routeOffers={selectedRouteOffers}
                    isFindingDrivers={isSelectedRouteFinding}
                    isPanelDismissed={isSelectedRouteDismissed}
                    onAcceptOffer={handleAcceptOffer}
                    isAcceptingOffer={isAcceptingOffer}
                    onCloseFindingPanel={handleCloseFindingPanel}
                    onOpenFindingPanel={handleOpenFindingPanel}
                    onHoverOffer={handleHoverOffer}
                    selectedOfferId={selectedOfferId}
                    isAssigned={isAssigned}
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
