import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    driverId: string;
    status: 'EN_ROUTE' | 'ARRIVED';
    onCancel?: () => void;
}

export default function ArrivalView({ driverId, status, onCancel }: Props) {
    const isArrived = status === 'ARRIVED';

    return (
        <View style={styles.container}>
            <View style={[styles.badge, isArrived ? styles.badgeArrived : styles.badgeEnRoute]}>
                <Text style={[styles.badgeText, isArrived ? styles.badgeTextArrived : styles.badgeTextEnRoute]}>
                    {isArrived ? 'Arrived' : 'On The Way'}
                </Text>
            </View>
            <Text style={styles.title}>{isArrived ? 'Your Driver is Here' : 'Driver is approaching'}</Text>
            <Text style={styles.subtitle}>Driver ID: {driverId.slice(-6)}</Text>
            <Text style={styles.instruction}>
                {isArrived ? 'Please locate your driver and board the vehicle.' : 'Your driver will arrive shortly.'}
            </Text>
            
            <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
                    <Text style={styles.secondaryButtonText}>Cancel Ride</Text>
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16
    },
    badgeArrived: {
        backgroundColor: '#e6ffed',
    },
    badgeEnRoute: {
        backgroundColor: '#e6f2ff',
    },
    badgeText: {
        fontWeight: 'bold',
        fontSize: 12
    },
    badgeTextArrived: {
        color: '#28a745',
    },
    badgeTextEnRoute: {
        color: '#007bff',
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
    secondaryButton: {
        backgroundColor: '#f1f5f9',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center'
    },
    secondaryButtonText: {
        color: '#64748b',
        fontWeight: 'bold',
        fontSize: 16
    }
});
