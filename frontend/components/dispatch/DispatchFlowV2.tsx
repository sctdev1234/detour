import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useDispatchFlow } from '../../hooks/useDispatchFlow';
import { Colors } from '../../constants/theme';

interface Props {
    onClose: () => void;
}

export default function DispatchFlowV2({ onClose }: Props) {
    const { 
        status, 
        offers, 
        assignment, 
        error, 
        acceptOffer, 
        cancelSearch 
    } = useDispatchFlow();

    const handleCancel = () => {
        cancelSearch();
        onClose();
    };

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Error: {error}</Text>
                <TouchableOpacity style={styles.button} onPress={handleCancel}>
                    <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (status === 'ASSIGNED' && assignment) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Driver Assigned!</Text>
                <Text style={styles.subtitle}>Driver ID: {assignment.driverId}</Text>
                <TouchableOpacity style={styles.button} onPress={onClose}>
                    <Text style={styles.buttonText}>View Active Trip</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (offers.length > 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Offers Received ({offers.length})</Text>
                {offers.map(offer => (
                    <TouchableOpacity 
                        key={offer._id} 
                        style={styles.offerCard}
                        onPress={() => acceptOffer(offer._id)}
                    >
                        <Text style={styles.offerText}>Driver: {offer.driverId}</Text>
                        <Text style={styles.offerText}>Price: MAD {offer.price}</Text>
                        <Text style={styles.offerText}>ETA: {Math.round(offer.estimatedArrival / 60)} mins</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                    <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Default to SEARCHING state
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.title}>Searching for Drivers...</Text>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        width: '100%'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        marginBottom: 20,
        textAlign: 'center'
    },
    offerCard: {
        width: '100%',
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    offerText: {
        fontSize: 16,
        color: '#333'
    },
    button: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
        width: '100%',
        alignItems: 'center'
    },
    cancelButton: {
        backgroundColor: '#ff4444'
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
