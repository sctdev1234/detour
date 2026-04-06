import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Animated from 'react-native-reanimated';
import { MapPin, Car } from 'lucide-react-native';
import { optimizeRoute, getAllPointsFromTrip } from '../../utils/mapUtils';

interface DashboardMapProps {
    initialRegion: any;
    userCoords: { latitude: number; longitude: number } | null;
    pulseStyle: any;
    showSavedPlaces: boolean;
    places: any[];
    getSavedPlaceColor: (icon?: string) => string;
    routePolylines: any[];
    activeTrip: any;
    styles: any;
    theme: any;
}

const DashboardMap = forwardRef<MapView, DashboardMapProps>((props, ref) => {
    const {
        initialRegion,
        userCoords,
        pulseStyle,
        showSavedPlaces,
        places,
        getSavedPlaceColor,
        routePolylines,
        activeTrip,
        styles: externalStyles,
        theme
    } = props;

    React.useEffect(() => {
        if (!ref || !('current' in ref) || !ref.current) return;

        const markersToFit: any[] = [];
        if (userCoords && userCoords.latitude !== 0 && userCoords.longitude !== 0) {
            markersToFit.push(userCoords);
        }

        if (activeTrip) {
            // If there's an active/displayed trip, prioritize its points
            const tripPoints = getAllPointsFromTrip(activeTrip);
            if (tripPoints.length > 0) {
                markersToFit.push(...tripPoints);
            }
        } else if (routePolylines?.length) {
            // Fallback: zoom to see all routes only if no primary trip
            routePolylines.forEach(r => {
                if (r.coords?.length) markersToFit.push(...r.coords);
                if (r.startPoint) markersToFit.push(r.startPoint);
                if (r.endPoint) markersToFit.push(r.endPoint);
            });
        }

        // Final sanity filter before fitting
        const validMarkers = markersToFit.filter(p => 
            p && typeof p.latitude === 'number' && p.latitude !== 0 && p.longitude !== 0
        );

        if (validMarkers.length >= 2) {
            const map = (ref as any).current as MapView;
            setTimeout(() => {
                map.fitToCoordinates(validMarkers, {
                    edgePadding: { top: 120, right: 60, bottom: 250, left: 60 }, // Extra bottom padding for bottom sheet
                    animated: true,
                });
            }, 700);
        } else if (validMarkers.length === 1) {
            const map = (ref as any).current as MapView;
            map.animateToRegion({
                latitude: validMarkers[0].latitude,
                longitude: validMarkers[0].longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
        }
    }, [routePolylines, userCoords, activeTrip]);

    return (
        <MapView
            ref={ref}
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            showsScale={false}
            mapPadding={{ top: 100, right: 0, bottom: 160, left: 0 }}
        >
            {/* ===== USER LOCATION (Blue Pulsing Dot) ===== */}
            {userCoords && (
                <Marker
                    coordinate={userCoords}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={true}
                >
                    <View style={externalStyles.userLocationContainer}>
                        {/* Pulse ring */}
                        <Animated.View style={[externalStyles.pulseRing, pulseStyle]} />
                        {/* Inner dot */}
                        <View style={externalStyles.userDot} />
                    </View>
                </Marker>
            )}

            {/* ===== SAVED PLACES ===== */}
            {showSavedPlaces && places.map((place, index) => (
                place.latitude !== 0 && place.longitude !== 0 && (
                    <Marker
                        key={`place-${place._id || index}`}
                        coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={[externalStyles.savedPlaceMarker, { backgroundColor: getSavedPlaceColor(place.icon) }]}>
                            <View style={externalStyles.savedPlaceInner}>
                                <View style={[externalStyles.savedPlaceDot, { backgroundColor: getSavedPlaceColor(place.icon) }]} />
                            </View>
                        </View>
                    </Marker>
                )
            ))}

            {/* ===== SAVED ROUTES (Polylines) ===== */}
            {routePolylines.map((route) => (
                <React.Fragment key={`route-${route.id}`}>
                    {route.coords.length > 1 && (
                        <Polyline
                            coordinates={route.coords.filter((c: any) => c.latitude !== 0 && c.longitude !== 0)}
                            strokeColor={route.color}
                            strokeWidth={route.width}
                            lineDashPattern={route.isActive ? undefined : [8, 4]}
                        />
                    )}
                    {/* Start Marker */}
                    {route.startPoint && route.startPoint.latitude !== 0 && route.startPoint.longitude !== 0 && (
                        <Marker
                            coordinate={route.startPoint}
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View style={[externalStyles.routeEndpoint, {
                                backgroundColor: route.isActive ? '#10b981' : 'rgba(79, 70, 229, 0.6)',
                                borderColor: '#fff',
                            }]}>
                                <View style={externalStyles.routeEndpointInner} />
                            </View>
                        </Marker>
                    )}
                    {/* End Marker */}
                    {route.endPoint && route.endPoint.latitude !== 0 && route.endPoint.longitude !== 0 && (
                        <Marker
                            coordinate={route.endPoint}
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View style={[externalStyles.routeEndpoint, {
                                backgroundColor: route.isActive ? '#ef4444' : 'rgba(239, 68, 68, 0.5)',
                                borderColor: '#fff',
                            }]}>
                                <View style={externalStyles.routeEndpointInner} />
                            </View>
                        </Marker>
                    )}
                </React.Fragment>
            ))}

            {/* ===== TRIP MARKERS (CAR, NUMBERS, END) ===== */}
            {activeTrip && (() => {
                const { sortedPoints } = optimizeRoute(
                    activeTrip.routeId?.startPoint,
                    activeTrip.routeId?.endPoint,
                    activeTrip.routeId?.waypoints || [],
                    activeTrip.clients || []
                );

                const startPoint = activeTrip.routeId?.startPoint;
                const endPoint = activeTrip.routeId?.endPoint;

                return (
                    <>
                        {/* Start (Car) */}
                        {startPoint && startPoint.latitude !== 0 && (
                            <Marker coordinate={startPoint} anchor={{ x: 0.5, y: 0.5 }}>
                                <View style={[styles.markerIcon, { backgroundColor: '#10b981' }]}>
                                    <Car size={18} color="#fff" />
                                </View>
                            </Marker>
                        )}

                        {/* Middle Points (Numbers) */}
                        {sortedPoints.map((point: any, idx: number) => {
                            const color = point.type === 'pickup' ? theme.primary : theme.secondary;
                            return (
                                <Marker key={`wp-${idx}`} coordinate={{ latitude: point.lat, longitude: point.lon }} anchor={{ x: 0.5, y: 0.5 }}>
                                    <View style={[styles.markerIcon, { backgroundColor: color, width: 24, height: 24, borderRadius: 12 }]}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{idx + 1}</Text>
                                    </View>
                                </Marker>
                            );
                        })}

                        {/* End (Pin) */}
                        {endPoint && endPoint.latitude !== 0 && (
                            <Marker coordinate={endPoint} anchor={{ x: 0.5, y: 0.5 }}>
                                <View style={[styles.markerIcon, { backgroundColor: '#ef4444' }]}>
                                    <MapPin size={18} color="#fff" />
                                </View>
                            </Marker>
                        )}
                    </>
                );
            })()}
        </MapView>
    );
});

const styles = StyleSheet.create({
    markerIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    }
});

export default DashboardMap;
