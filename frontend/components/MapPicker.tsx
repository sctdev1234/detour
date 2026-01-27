import { Navigation, Trash2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useLocationStore } from '../store/useLocationStore';
import { LatLng } from '../store/useTripStore';

interface MapPickerProps {
    onPointsChange?: (points: LatLng[]) => void;
    initialPoints?: LatLng[];
    theme: any;
    driverLocation?: { latitude: number; longitude: number; heading: number };
    readOnly?: boolean;
}

export default function MapPicker({ onPointsChange, initialPoints = [], theme, driverLocation, readOnly = false }: MapPickerProps) {
    const mapRef = useRef<MapView>(null);
    const { location } = useLocationStore();
    const [points, setPoints] = useState<LatLng[]>(initialPoints);

    useEffect(() => {
        if (initialPoints.length > 0) {
            setPoints(initialPoints);
        }
    }, [initialPoints]);

    useEffect(() => {
        if (driverLocation && mapRef.current) {
            // Optional: Animate to driver if tracking? Or just show marker.
            // mapRef.current.animateCamera({ center: driverLocation, heading: driverLocation.heading });
        }
    }, [driverLocation]);

    const handlePress = (e: any) => {
        if (readOnly) return;
        const newPoint = e.nativeEvent.coordinate;
        const newPoints = [...points, newPoint];
        setPoints(newPoints);
        onPointsChange && onPointsChange(newPoints);
    };

    // removePoint removed

    const clearPoints = () => {
        setPoints([]);
        onPointsChange && onPointsChange([]);
    };

    const centerToMyLocation = () => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: 33.5731, // Casablanca
                    longitude: -7.5898,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                onPress={handlePress}
                showsUserLocation={true}
            >
                {points.map((point, index) => (
                    <Marker
                        key={index}
                        coordinate={point}
                        pinColor={index === 0 ? 'green' : index === points.length - 1 ? 'red' : 'blue'}
                    >
                        <View style={[styles.markerBadge, { backgroundColor: index === 0 ? '#4CD964' : index === points.length - 1 ? '#FF3B30' : '#007AFF' }]}>
                            <Text style={styles.markerText}>{index + 1}</Text>
                        </View>
                    </Marker>
                ))}

                {driverLocation && (
                    <Marker
                        coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        rotation={driverLocation.heading}
                    >
                        <View style={[styles.carMarker, { backgroundColor: theme.primary }]}>
                            <Car size={20} color="#fff" />
                        </View>
                    </Marker>
                )}

                {points.length > 1 && (
                    <Polyline
                        coordinates={points}
                        strokeColor={theme.primary}
                        strokeWidth={3}
                    />
                )}
            </MapView>

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 400,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    markerText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    infoBox: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 22,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    infoText: {
        fontWeight: '700',
        fontSize: 12,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    }
});
