import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    onCancel: () => void;
}

export default function SearchingView({ onCancel }: Props) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.title}>Searching for Drivers...</Text>
            <Text style={styles.subtitle}>We are pinging nearby drivers.</Text>
            
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel Trip</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
        color: '#333'
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center'
    },
    cancelButton: {
        backgroundColor: '#ff4444',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center'
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
