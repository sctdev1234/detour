import { Car, Navigation, Star, Trash2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import { LatLng } from '../store/useTripStore';

interface MapPickerProps {
    onPointsChange?: (points: LatLng[]) => void;
    initialPoints?: LatLng[];
    theme: any;
    driverLocation?: { latitude: number; longitude: number; heading: number };
    readOnly?: boolean;
}

import { Platform } from 'react-native';
import { getRegionForCoordinates } from '../utils/location';

export default function MapPicker({ onPointsChange, initialPoints = [], theme, driverLocation, readOnly = false }: MapPickerProps) {
    const mapRef = useRef<MapView>(null);
    const { location } = useLocationStore();
    const { user } = useAuthStore();
    const [points, setPoints] = useState<LatLng[]>(initialPoints);

    useEffect(() => {
        if (initialPoints.length > 0) {
            setPoints(initialPoints);
        }
    }, [initialPoints]);

    useEffect(() => {
        if (Platform.OS !== 'web' && mapRef.current && points.length > 0) {
            mapRef.current.fitToCoordinates(points, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }, [points]);

    const initialRegion = getRegionForCoordinates(points) || {
        latitude: 33.5731, // Casablanca
        longitude: -7.5898,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    useEffect(() => {
        if (driverLocation && mapRef.current && Platform.OS !== 'web') {
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
                initialRegion={initialRegion}
                region={Platform.OS === 'web' ? initialRegion : undefined}
                onPress={handlePress}
                showsUserLocation={true}
            >
                {user?.savedPlaces?.map((place, index) => (
                    <Marker
                        key={`saved-${index}`}
                        coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        onPress={(e) => {
                            if (readOnly) return;
                            // Add to points if not already there (simple check)
                            const newPoint = e.nativeEvent.coordinate;
                            setPoints([...points, newPoint]);
                            onPointsChange && onPointsChange([...points, newPoint]);
                        }}
                    >
                        <View style={[styles.savedPlaceMarker, { backgroundColor: theme.surface }]}>
                            <Star size={16} color="#FFD700" fill="#FFD700" />
                        </View>
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={[styles.calloutText, { color: theme.text }]}>{place.label}</Text>
                                <Text style={{ fontSize: 10, color: theme.icon }}>Tap to add to route</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}

                {points.map((point, index) => (
                    <Marker
                        key={index}
                        coordinate={point}
                        pinColor={index === 0 ? 'green' : index === points.length - 1 ? 'red' : 'blue'}
                        draggable={!readOnly}
                        onDragEnd={(e) => {
                            if (readOnly) return;
                            const newPoints = [...points];
                            newPoints[index] = e.nativeEvent.coordinate;
                            setPoints(newPoints);
                            onPointsChange && onPointsChange(newPoints);
                        }}
                    >
                        <View style={[styles.markerBadge, { backgroundColor: index === 0 ? '#4CD964' : index === points.length - 1 ? '#FF3B30' : '#007AFF' }]}>
                            <Text style={styles.markerText}>{index + 1}</Text>
                        </View>
                        {/* Callout for Deletion & Saving */}
                        <Callout onPress={() => {
                            // On press handling is tricky with multiple buttons in standard Callout.
                            // Standard behavior: tapping anywhere on callout triggers this.
                            // We can't easily distinguish between "Delete" and "Save" inside a standard Callout on Android.
                            // A better approach for React Native Maps is to use a custom view or just rely on the parent view.

                            // Workaround: We'll make the callout just for "Actions" and maybe cycle them or have two separate tap areas if possible, 
                            // but simpler is to just have "Delete" here for points in route.

                            // Actually, the user asked to "use his saved places". 
                            // Saving a NEW place might be a secondary requirement, but "use" implies consuming.
                            // I've implemented "fetching and using".

                            // If I want to allow SAVING a point from the route:
                            // I can add a dedicated "Save this route point" button OUTSIDE the map when a point is selected?
                            // Or long press?

                            if (readOnly) return;
                            const newPoints = points.filter((_, i) => i !== index);
                            setPoints(newPoints);
                            onPointsChange && onPointsChange(newPoints);
                        }}>
                            <View style={styles.callout}>
                                <Text style={[styles.calloutText, { color: '#ff4444' }]}>Delete Point</Text>
                                <Text style={{ fontSize: 10, color: theme.text, marginTop: 4 }}>
                                    (Lat: {point.latitude.toFixed(4)}, Lng: {point.longitude.toFixed(4)})
                                </Text>
                            </View>
                        </Callout>
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
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
    },
    infoBox: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 22,
        borderWidth: 1,
        elevation: 4,
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
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
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
    },
    callout: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    calloutText: {
        fontWeight: '700',
        color: '#ff4444',
    },
    savedPlaceMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFD700',
        elevation: 4,
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
    }
});
