import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Animated from 'react-native-reanimated';

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
            ))}

            {/* ===== SAVED ROUTES (Polylines) ===== */}
            {routePolylines.map((route) => (
                <React.Fragment key={`route-${route.id}`}>
                    {route.coords.length > 1 && (
                        <Polyline
                            coordinates={route.coords}
                            strokeColor={route.color}
                            strokeWidth={route.width}
                            lineDashPattern={route.isActive ? undefined : [8, 4]}
                        />
                    )}
                    {/* Start Marker */}
                    {route.startPoint && (
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
                    {route.endPoint && (
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

            {/* ===== ACTIVE TRIP PASSENGERS ===== */}
            {activeTrip?.clients?.map((client: any, idx: number) => {
                const pickupCoords = client.routeId?.startPoint;
                const dropoffCoords = client.routeId?.endPoint;

                return (
                    <React.Fragment key={`client-${idx}`}>
                        {pickupCoords && (
                            <Marker
                                coordinate={pickupCoords}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View style={[externalStyles.clientMarker, { backgroundColor: '#10b981' }]}>
                                    <View style={externalStyles.clientMarkerInner} />
                                </View>
                            </Marker>
                        )}
                        {dropoffCoords && (
                            <Marker
                                coordinate={dropoffCoords}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View style={[externalStyles.clientMarker, { backgroundColor: '#ef4444' }]}>
                                    <View style={externalStyles.clientMarkerInner} />
                                </View>
                            </Marker>
                        )}
                    </React.Fragment>
                );
            })}
        </MapView>
    );
});

export default DashboardMap;
