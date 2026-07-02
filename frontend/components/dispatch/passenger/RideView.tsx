import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../../constants/theme';

export default function RideView() {
    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>In Progress</Text>
            </View>
            <Text style={styles.title}>En Route to Destination</Text>
            <Text style={styles.subtitle}>Sit back and relax.</Text>
            
            <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 20 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
    },
    badge: {
        backgroundColor: '#e6f7ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16
    },
    badgeText: {
        color: Colors.light.primary,
        fontWeight: 'bold',
        fontSize: 12
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8
    }
});
