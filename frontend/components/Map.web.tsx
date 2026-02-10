import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { MapProps } from './Map';

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

    return <MapComponent {...props} />;
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
