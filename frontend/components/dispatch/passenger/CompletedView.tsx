import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    onDone: () => void;
}

export default function CompletedView({ onDone }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>Completed</Text>
            </View>
            <Text style={styles.title}>You have arrived!</Text>
            <Text style={styles.subtitle}>Thank you for riding with Detour.</Text>
            
            <TouchableOpacity style={styles.primaryButton} onPress={onDone}>
                <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
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
        marginBottom: 32
    },
    primaryButton: {
        backgroundColor: Colors.light.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%'
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
