import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    summary?: any;
    onDone: () => void;
}

export default function CompletedView({ summary, onDone }: Props) {
    const fare = summary?.finalPrice || 'MAD 0.00';
    const distance = summary?.distanceKm ? `${summary.distanceKm} km` : '0 km';
    const duration = summary?.durationMins ? `${summary.durationMins} min` : '0 min';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>Completed</Text>
                </View>
                <Text style={styles.title}>You have arrived!</Text>
                <Text style={styles.subtitle}>Thank you for riding with Detour.</Text>
            </View>

            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Fare</Text>
                    <Text style={styles.summaryValueHighlight}>{fare}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Distance</Text>
                    <Text style={styles.summaryValue}>{distance}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Duration</Text>
                    <Text style={styles.summaryValue}>{duration}</Text>
                </View>
            </View>

            <View style={styles.driverSection}>
                <Text style={styles.driverLabel}>How was your driver?</Text>
                <View style={styles.ratingRow}>
                    {/* Placeholder for Rating Stars */}
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={styles.starPlaceholder}>★</Text>
                    ))}
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryActionBtn}>
                    <Text style={styles.secondaryActionText}>Report Issue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryActionBtn}>
                    <Text style={styles.secondaryActionText}>Favorite Driver</Text>
                </TouchableOpacity>
            </View>
            
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
    header: {
        alignItems: 'center',
        marginBottom: 24,
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
    },
    summaryCard: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 16,
        color: '#64748b',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    summaryValueHighlight: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.light.primary,
    },
    driverSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    driverLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 12,
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 8,
    },
    starPlaceholder: {
        fontSize: 32,
        color: '#cbd5e1',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 24,
    },
    secondaryActionBtn: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    secondaryActionText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 14,
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
