import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Clock, MapPin, ChevronRight, Navigation, Loader } from 'lucide-react-native';
import { ClientTrip } from '../../types';
import { useCountdownDate } from '../../hooks/useCountdown';

type Props = {
    trip: ClientTrip;
    theme: any;
    index: number;
    isSelected?: boolean;
    onPress: () => void;
    onDetailsPress: () => void;
};

export default function TripCard({ trip, theme, index, isSelected = false, onPress, onDetailsPress }: Props) {
    const countdown = useCountdownDate(trip.nextOccurrence || null);

    const statusConfig = {
        searching: { label: 'Searching...', color: '#F59E0B', bgColor: '#F59E0B15' },
        matched: { label: 'Driver Found', color: '#10B981', bgColor: '#10B98115' },
        active: { label: 'In Progress', color: '#EF4444', bgColor: '#EF444415' },
        completed: { label: 'Completed', color: '#6B7280', bgColor: '#6B728015' },
        cancelled: { label: 'Cancelled', color: '#9CA3AF', bgColor: '#9CA3AF15' },
    };

    const config = statusConfig[trip.status];
    const isDark = theme.background === '#000000';

    return (
        <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
            <TouchableOpacity
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)',
                        borderColor: isSelected ? theme.primary : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                        borderWidth: isSelected ? 2 : 1,
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.85}
            >
                {/* Status badge + Countdown */}
                <View style={styles.topRow}>
                    <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
                        {trip.status === 'searching' && <Loader size={12} color={config.color} />}
                        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                    </View>

                    {countdown && trip.status !== 'active' && (
                        <View style={[styles.countdownBadge, { backgroundColor: theme.primary + '12' }]}>
                            <Clock size={11} color={theme.primary} />
                            <Text style={[styles.countdownText, { color: theme.primary }]}>{countdown}</Text>
                        </View>
                    )}
                </View>

                {/* Route info */}
                <View style={styles.routeSection}>
                    <View style={styles.routeTimeline}>
                        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                        <View style={[styles.routeLine, { backgroundColor: theme.border + '50' }]} />
                        <View style={[styles.squareDot, { borderColor: '#10B981' }]} />
                    </View>
                    <View style={styles.routeAddresses}>
                        <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                            {trip.startPoint.address || 'Pickup'}
                        </Text>
                        <Text style={[styles.addressText, { color: theme.text, marginTop: 4 }]} numberOfLines={1}>
                            {trip.endPoint.address || 'Destination'}
                        </Text>
                    </View>
                </View>

                {/* Bottom row: Schedule + Details button */}
                <View style={styles.bottomRow}>
                    <View style={styles.scheduleInfo}>
                        <Text style={[styles.scheduleText, { color: theme.textSecondary }]}>
                            {trip.days.join(', ')} • {trip.timeStart}
                        </Text>
                        <Text style={[styles.priceText, { color: theme.primary }]}>{trip.price} MAD</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.detailsBtn, { backgroundColor: theme.primary + '10' }]}
                        onPress={onDetailsPress}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.detailsBtnText, { color: theme.primary }]}>Details</Text>
                        <ChevronRight size={16} color={theme.primary} />
                    </TouchableOpacity>
                </View>

                {/* Driver info (when matched) */}
                {trip.driver && (
                    <View style={[styles.driverRow, { borderTopColor: theme.border + '30' }]}>
                        <View style={[styles.driverAvatar, { backgroundColor: theme.primary }]}>
                            <Text style={styles.driverAvatarText}>{trip.driver.fullName.charAt(0)}</Text>
                        </View>
                        <Text style={[styles.driverName, { color: theme.text }]}>{trip.driver.fullName}</Text>
                        <Navigation size={14} color={theme.primary} />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 22,
        padding: 16,
        gap: 12,
        elevation: 4,
        boxShadow: '0px 4px 20px rgba(0,0,0,0.08)',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    countdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    countdownText: {
        fontSize: 11,
        fontWeight: '700',
    },
    routeSection: {
        flexDirection: 'row',
        gap: 12,
    },
    routeTimeline: {
        alignItems: 'center',
        paddingTop: 3,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    routeLine: {
        width: 2,
        flex: 1,
        marginVertical: 3,
    },
    squareDot: {
        width: 10,
        height: 10,
        borderWidth: 2.5,
        borderRadius: 3,
    },
    routeAddresses: {
        flex: 1,
        justifyContent: 'space-between',
        minHeight: 44,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '700',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scheduleInfo: {
        flex: 1,
    },
    scheduleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    priceText: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 2,
    },
    detailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    detailsBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderTopWidth: 1,
        paddingTop: 12,
    },
    driverAvatar: {
        width: 28,
        height: 28,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    driverAvatarText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    driverName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
});
