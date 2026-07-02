import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Navigation, MapPin } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    trip: any;
    onComplete: () => void;
}

export default function TripActiveView({ trip, onComplete }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const destAddress = trip?.tripInstanceId?.destination?.address || trip?.destination?.address || 'Destination';

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={styles.headerRow}>
                <View style={[styles.liveBadge]}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>TRIP IN PROGRESS</Text>
                </View>
            </View>

            <View style={styles.destinationCard}>
                <MapPin size={18} color="#ef4444" />
                <View style={styles.destInfo}>
                    <Text style={[styles.destLabel, { color: theme.textSecondary }]}>Heading to</Text>
                    <Text style={[styles.destAddress, { color: theme.text }]} numberOfLines={2}>
                        {destAddress}
                    </Text>
                </View>
            </View>

            <View style={styles.navRow}>
                <TouchableOpacity
                    style={[styles.navButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                    activeOpacity={0.7}
                >
                    <Navigation size={18} color="#3b82f6" />
                    <Text style={[styles.navText, { color: '#3b82f6' }]}>Navigate</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: '#3b82f6' }]}
                onPress={onComplete}
                activeOpacity={0.8}
            >
                <Text style={styles.completeText}>COMPLETE TRIP</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderRadius: 20,
        marginHorizontal: 16,
    },
    headerRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    liveText: {
        color: '#10b981',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 1,
    },
    destinationCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
        marginBottom: 16,
    },
    destInfo: {
        flex: 1,
    },
    destLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 2,
    },
    destAddress: {
        fontSize: 14,
        fontWeight: '700',
    },
    navRow: {
        marginBottom: 16,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    navText: {
        fontWeight: '700',
        fontSize: 14,
    },
    completeButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    completeText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 15,
        letterSpacing: 0.5,
    }
});
