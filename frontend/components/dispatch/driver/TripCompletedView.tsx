import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
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

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios'
        ? { intensity: 90, tint: colorScheme }
        : {};
    
    const bgColor = colorScheme === 'dark'
        ? 'rgba(28, 28, 30, 0.95)'
        : 'rgba(255, 255, 255, 0.95)';

    return (
        <View style={styles.wrapper}>
            <Container
                {...containerProps}
                style={[styles.container, Platform.OS !== 'ios' && { backgroundColor: bgColor }]}
            >
                <View style={styles.iconContainer}>
                    <View style={styles.iconBackground}>
                        <CheckCircle size={48} color="#10b981" />
                    </View>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>Trip Complete!</Text>

                {summary && (
                    <View style={[styles.summaryGrid, { backgroundColor: theme.surfaceHighlight + '40' }]}>
                        <View style={styles.summaryItem}>
                            <DollarSign size={20} color={theme.primary} />
                            <Text style={[styles.summaryValue, { color: theme.text }]}>{summary.earnings?.toFixed(2) || '0.00'} MAD</Text>
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Earned</Text>
                        </View>
                        <View style={[styles.summaryDivider, { backgroundColor: 'rgba(156, 163, 175, 0.2)' }]} />
                        <View style={styles.summaryItem}>
                            <MapPin size={20} color="#3b82f6" />
                            <Text style={[styles.summaryValue, { color: theme.text }]}>{((summary.distance || 0) / 1000).toFixed(1)} km</Text>
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Distance</Text>
                        </View>
                        <View style={[styles.summaryDivider, { backgroundColor: 'rgba(156, 163, 175, 0.2)' }]} />
                        <View style={styles.summaryItem}>
                            <Clock size={20} color="#f59e0b" />
                            <Text style={[styles.summaryValue, { color: theme.text }]}>{Math.ceil((summary.duration || 0) / 60)} min</Text>
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Duration</Text>
                        </View>
                    </View>
                )}

                {summary?.rating != null && (
                    <View style={styles.ratingRow}>
                        <Star size={20} color="#f59e0b" fill="#f59e0b" />
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
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        paddingBottom: 20,
    },
    container: {
        padding: 32,
        borderRadius: 24,
        marginHorizontal: 16,
        alignItems: 'center',
        overflow: 'hidden',
    },
    iconContainer: {
        marginBottom: 20,
    },
    iconBackground: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        marginBottom: 24,
        letterSpacing: 0.5,
    },
    summaryGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        paddingVertical: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    summaryItem: {
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    summaryDivider: {
        width: 1,
        height: 40,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
        marginBottom: 28,
    },
    ratingText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#f59e0b',
    },
    doneButton: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        width: '100%',
    },
    doneText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    }
});
