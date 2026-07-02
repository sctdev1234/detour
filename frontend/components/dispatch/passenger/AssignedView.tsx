import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    driverId: string;
    onViewDetails?: () => void;
    onCancel: () => void;
}

export default function AssignedView({ driverId, onViewDetails, onCancel }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>Driver En Route</Text>
            </View>
            <Text style={styles.title}>Your Driver is Assigned</Text>
            <Text style={styles.subtitle}>Driver ID: {driverId.slice(-6)}</Text>
            
            <View style={styles.actions}>
                {onViewDetails && (
                    <TouchableOpacity style={styles.primaryButton} onPress={onViewDetails}>
                        <Text style={styles.primaryButtonText}>View Trip Details</Text>
                    </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Cancel Trip</Text>
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
        marginBottom: 32
    },
    actions: {
        width: '100%',
        gap: 12
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
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center'
    },
    cancelButtonText: {
        color: '#ff4444',
        fontWeight: 'bold',
        fontSize: 16
    }
});
