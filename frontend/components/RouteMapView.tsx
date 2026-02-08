import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LatLng } from '../store/useTripStore';

interface RouteMapViewProps {
    startPoint: LatLng;
    endPoint: LatLng;
    waypoints?: LatLng[];
    theme: any;
    height?: number;
}

export default function RouteMapView({ startPoint, endPoint, waypoints = [], theme, height = 200 }: RouteMapViewProps) {
    const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Only load Leaflet on client side (when window is defined)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            // Dynamically import the leaflet component
            import('./RouteMapViewLeaflet')
                .then((module) => {
                    setMapComponent(() => module.default);
                    setIsLoading(false);
                })
                .catch((err) => {
                    console.error('Failed to load map component:', err);
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, []);

    // Only render on web
    if (Platform.OS !== 'web') {
        return null;
    }

    // Show loading state while map component loads
    if (isLoading || !MapComponent) {
        return (
            <View style={[styles.container, styles.loadingContainer, { height }]}>
                <Text style={[styles.loadingText, { color: theme.icon }]}>Loading map...</Text>
            </View>
        );
    }

    return (
        <MapComponent
            startPoint={startPoint}
            endPoint={endPoint}
            waypoints={waypoints}
            theme={theme}
            height={height}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#e5e3df',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
    },
});
