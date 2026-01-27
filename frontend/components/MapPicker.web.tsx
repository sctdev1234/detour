import { Navigation, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LatLng } from '../store/useTripStore';

interface MapPickerProps {
    onPointsChange: (points: LatLng[]) => void;
    theme: any;
}

export default function MapPicker({ onPointsChange, theme }: MapPickerProps) {
    const [points, setPoints] = useState<LatLng[]>([]);

    const simulatePointAdd = () => {
        // Mock points for Casablanca -> Rabat area
        const mockPoints: LatLng[] = [
            { latitude: 33.5731, longitude: -7.5898 },
            { latitude: 34.0209, longitude: -6.8416 }
        ];

        const nextPoint = points.length === 0 ? mockPoints[0] :
            points.length === 1 ? mockPoints[1] :
                { latitude: points[points.length - 1].latitude + 0.01, longitude: points[points.length - 1].longitude + 0.01 };

        const newPoints = [...points, nextPoint];
        setPoints(newPoints);
        onPointsChange(newPoints);
    };

    const clearPoints = () => {
        setPoints([]);
        onPointsChange([]);
    };

    return (
        <View style={styles.container}>
            <View style={[styles.webPlaceholder, { backgroundColor: theme.surface }]}>
                <Text style={[styles.placeholderText, { color: theme.icon }]}>
                    Map view is optimized for mobile devices.
                </Text>
                <Text style={[styles.placeholderSubtext, { color: theme.icon }]}>
                    Interactive map features are unavailable on web.
                </Text>

                <TouchableOpacity
                    style={[styles.simulateButton, { backgroundColor: theme.primary }]}
                    onPress={simulatePointAdd}
                >
                    <Text style={styles.simulateButtonText}>Simulate Route Selection</Text>
                </TouchableOpacity>

                {points.length > 0 && (
                    <View style={styles.pointsList}>
                        <Text style={{ color: theme.text, fontWeight: '700' }}>Points Added: {points.length}</Text>
                        <Text style={{ color: theme.icon, fontSize: 10 }}>
                            {points[0].latitude.toFixed(4)}, {points[0].longitude.toFixed(4)} ...
                        </Text>
                    </View>
                )}
            </View>

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
                        onPress={() => { }}
                    >
                        <Navigation size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.infoText, { color: theme.text }]}>
                        {points.length === 0 ? 'Click button to simulate Start Point' :
                            points.length === 1 ? 'Click button to simulate End Point' :
                                `Route with ${points.length} points simulated`}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 480,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    webPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 12,
    },
    placeholderText: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    placeholderSubtext: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    simulateButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    simulateButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    pointsList: {
        marginTop: 20,
        alignItems: 'center',
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
    },
    infoBox: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 22,
        borderWidth: 1,
    },
    infoText: {
        fontWeight: '700',
        fontSize: 12,
    },
});
