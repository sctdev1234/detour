import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    driverId: string;
    onBoarded: () => void;
}

export default function ArrivalView({ driverId, onBoarded }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>Arrived</Text>
            </View>
            <Text style={styles.title}>Your Driver is Here</Text>
            <Text style={styles.subtitle}>Driver ID: {driverId.slice(-6)}</Text>
            <Text style={styles.instruction}>Please locate your driver and board the vehicle.</Text>
            
            <View style={styles.actions}>
                <TouchableOpacity style={styles.primaryButton} onPress={onBoarded}>
                    <Text style={styles.primaryButtonText}>I'm in the car</Text>
                </TouchableOpacity>
            </View>
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
        backgroundColor: '#e6ffed',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16
    },
    badgeText: {
        color: '#28a745',
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
    },
    instruction: {
        fontSize: 14,
        color: '#888',
        marginBottom: 32,
        textAlign: 'center'
    },
    actions: {
        width: '100%'
    },
    primaryButton: {
        backgroundColor: Colors.light.primary,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center'
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
