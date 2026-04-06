import React, { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';

const DashboardMap = forwardRef<any, any>((props, ref) => {
    const [LeafletMap, setLeafletMap] = useState<any>(null);

    useEffect(() => {
        // Only load on web
        if (typeof window !== 'undefined') {
            import('../MapLeaflet').then((module) => {
                setLeafletMap(() => module.default);
            }).catch(err => {
                console.error("Leaflet load error:", err);
            });
        }
    }, []);

    // Placeholder until loaded
    if (!LeafletMap) {
        return (
            <View style={styles.placeholderContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>Loading Map...</Text>
            </View>
        );
    }

    // Map props from react-native-maps to MapLeaflet as best as possible
    // Note: MapLeaflet has its own 'mode' system. 
    // For Dashboard, we can try 'trip' mode or pass custom props.
    // For now, let's just render it.

    return (
        <LeafletMap
            {...props}
            trip={props.activeTrip}
            savedPlaces={props.places}
            mode="trip" 
            fullScreen={true}
            style={StyleSheet.absoluteFillObject}
        />
    );
});

const styles = StyleSheet.create({
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    }
});

export default DashboardMap;
