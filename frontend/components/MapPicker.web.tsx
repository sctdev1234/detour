import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

// Dynamically import the Leaflet component on client-side only
// This is necessary because 'leaflet' accesses 'window' during module initialization
export default function MapPicker(props: any) {
    const [MapComponent, setMapComponent] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;

        // Only import relevant map on web client
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            import('./MapPickerLeaflet').then((module) => {
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading Map...</Text>
            </View>
        );
    }

    return <MapComponent {...props} />;
}

const styles = StyleSheet.create({
    loadingContainer: {
        height: 400,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 14,
    }
});
