import React, { Component, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { MapProps } from './Map';

// Error boundary to catch Leaflet DOM errors
class MapErrorBoundary extends Component<{ children: React.ReactNode; height?: any; theme?: any }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: any) { console.warn('[MapErrorBoundary] Leaflet error caught:', error.message); }
    render() {
        if (this.state.hasError) {
            return (
                <View style={[styles.loadingContainer, { height: this.props.height || 300 }]}>
                    <Text style={{ color: this.props.theme?.icon || '#666', fontSize: 14 }}>Map unavailable</Text>
                </View>
            );
        }
        return this.props.children;
    }
}

// Dynamically import the Leaflet component on client-side only
export default function Map(props: MapProps) {
    const [MapComponent, setMapComponent] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;

        // Only import relevant map on web client
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            import('./MapLeaflet').then((module) => {
                if (isMounted) {
                    setMapComponent(() => module.default);
                }
            }).catch((err) => {
                console.error("Failed to load map component:", err);
            });
        }

        return () => {
            isMounted = false;
        };
    }, []);

    if (!MapComponent) {
        return (
            <View style={[styles.loadingContainer, { height: props.height || 300 }]}>
                <ActivityIndicator size="large" color={props.theme?.primary || "#007AFF"} />
                <Text style={[styles.loadingText, { color: props.theme?.icon || "#666" }]}>Loading Map...</Text>
            </View>
        );
    }

    return (
        <MapErrorBoundary height={props.height} theme={props.theme}>
            <MapComponent {...props} />
        </MapErrorBoundary>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
    }
});
