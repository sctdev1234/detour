import { Car, MapPin, User } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Trip } from '../store/useTripStore';

interface TripMapProps {
    trip: Trip;
    theme: any;
}

export default function TripMap({ trip, theme }: TripMapProps) {
    const mapRef = useRef<MapView>(null);

    const driverRoute = trip.routeId;
    const clients = trip.clients || [];

    // Extract all relevant points to fit camera
    const allPoints = [];
    if (driverRoute?.startPoint?.latitude) allPoints.push(driverRoute.startPoint);
    if (driverRoute?.endPoint?.latitude) allPoints.push(driverRoute.endPoint);
    clients.forEach(c => {
        if (c.routeId?.startPoint?.latitude) allPoints.push(c.routeId.startPoint);
        if (c.routeId?.endPoint?.latitude) allPoints.push(c.routeId.endPoint);
    });

    useEffect(() => {
        if (mapRef.current && allPoints.length > 0) {
            mapRef.current.fitToCoordinates(allPoints, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }, [trip]);

    if (!driverRoute) return <View style={styles.container}><Text>Loading Route...</Text></View>;

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: driverRoute.startPoint.latitude || 33.5731,
                    longitude: driverRoute.startPoint.longitude || -7.5898,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                {/* Driver Route Line */}
                {/* We need coordinate objects {latitude, longitude} */}
                {/* For MVP we only have start/end and maybe waypoints. 
                    If we had full geometry (polyline string), we would decode it. 
                    For now, draw straight line start->end or start->waypoints->end. 
                */}
                <Polyline
                    coordinates={[
                        driverRoute.startPoint,
                        ...(driverRoute.waypoints || []),
                        driverRoute.endPoint
                    ]}
                    strokeColor={theme.primary}
                    strokeWidth={4}
                />

                {/* Driver Start */}
                <Marker coordinate={driverRoute.startPoint} pinColor="green">
                    <View style={[styles.markerBadge, { backgroundColor: '#10b981' }]}>
                        <Car size={14} color="#fff" />
                    </View>
                </Marker>

                {/* Driver End */}
                <Marker coordinate={driverRoute.endPoint} pinColor="red">
                    <View style={[styles.markerBadge, { backgroundColor: '#ef4444' }]}>
                        <MapPin size={14} color="#fff" />
                    </View>
                </Marker>

                {/* Clients */}
                {clients.map((client, index) => (
                    <React.Fragment key={index}>
                        {/* Client Pickup */}
                        {client.routeId?.startPoint && (
                            <Marker coordinate={client.routeId.startPoint}>
                                <View style={[styles.clientMarker, { backgroundColor: theme.secondary }]}>
                                    <User size={12} color="#fff" />
                                </View>
                            </Marker>
                        )}
                        {/* Client Dropoff */}
                        {client.routeId?.endPoint && (
                            <Marker coordinate={client.routeId.endPoint}>
                                <View style={[styles.clientMarker, { backgroundColor: theme.secondary, opacity: 0.7 }]}>
                                    <MapPin size={12} color="#fff" />
                                </View>
                            </Marker>
                        )}
                    </React.Fragment>
                ))}

            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 300,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        marginTop: 16,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 4,
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
    }
});
