import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { CheckCircle, Star, DollarSign, Clock, MapPin } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';
import { DriverTripSummary } from '../../../store/useDriverDispatchStore';

interface Props {
    summary: DriverTripSummary | null;
    onDone: () => void;
}

export default function TripCompletedView({ summary, onDone }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={styles.iconContainer}>
                <CheckCircle size={56} color="#10b981" />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>Trip Complete!</Text>

            {summary && (
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                        <DollarSign size={20} color={theme.primary} />
                        <Text style={[styles.summaryValue, { color: theme.text }]}>{summary.earnings?.toFixed(2) || '0.00'} MAD</Text>
                        <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Earned</Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.summaryItem}>
                        <MapPin size={20} color="#3b82f6" />
                        <Text style={[styles.summaryValue, { color: theme.text }]}>{((summary.distance || 0) / 1000).toFixed(1)} km</Text>
                        <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Distance</Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.summaryItem}>
                        <Clock size={20} color="#f59e0b" />
                        <Text style={[styles.summaryValue, { color: theme.text }]}>{Math.ceil((summary.duration || 0) / 60)} min</Text>
                        <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Duration</Text>
                    </View>
                </View>
            )}

            {summary?.rating != null && (
                <View style={styles.ratingRow}>
                    <Star size={18} color="#f59e0b" fill="#f59e0b" />
                    <Text style={[styles.ratingText, { color: theme.text }]}>{summary.rating.toFixed(1)}</Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={onDone}
                activeOpacity={0.8}
            >
                <Text style={styles.doneText}>BACK TO DASHBOARD</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 28,
        borderRadius: 20,
        marginHorizontal: 16,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 24,
    },
    summaryGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        paddingVertical: 16,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 14,
        marginBottom: 20,
    },
    summaryItem: {
        alignItems: 'center',
        gap: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    summaryDivider: {
        width: 1,
        height: 36,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 24,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: '800',
    },
    doneButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        width: '100%',
    },
    doneText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 15,
        letterSpacing: 0.5,
    }
});
