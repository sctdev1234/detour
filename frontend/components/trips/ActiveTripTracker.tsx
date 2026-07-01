import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import {
    Phone,
    MessageCircle,
    Navigation,
    Clock,
    MapPin,
    User,
    Shield,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ClientTrip } from '../../types';
import { useTrackingStore } from '../../store/useTrackingStore';
import { useCountdownDate } from '../../hooks/useCountdown';

type Props = {
    trip: ClientTrip;
    theme: any;
    colorScheme: 'light' | 'dark';
};

export default function ActiveTripTracker({ trip, theme, colorScheme }: Props) {
    const router = useRouter();
    const isDark = colorScheme === 'dark';

    const { subscribeToDriver, unsubscribe, driverLocation } = useTrackingStore();

    // Subscribe to driver location
    useEffect(() => {
        if (trip.driver?.id) {
            subscribeToDriver(trip.driver.id);
        }
        return () => unsubscribe();
    }, [trip.driver?.id]);

    // Status text mapping
    const statusInfo = useMemo(() => {
        switch (trip.clientStatus) {
            case 'WAITING':
                return { text: 'Waiting for driver', color: '#F59E0B', subtext: 'Driver is on the way to pick you up' };
            case 'READY':
                return { text: 'Ready for pickup', color: '#10B981', subtext: 'Driver knows you are ready' };
            case 'PICKUP_INCOMING':
                return { text: 'Driver arriving', color: '#0A84FF', subtext: 'Your driver is almost at your pickup point' };
            case 'IN_CAR':
                return { text: 'In the car', color: '#10B981', subtext: 'Enjoy your ride!' };
            case 'DROPPED_OFF':
                return { text: 'Dropped off', color: '#6B7280', subtext: 'You have arrived at your destination' };
            default:
                return { text: 'Trip in progress', color: '#0A84FF', subtext: 'Follow your trip status below' };
        }
    }, [trip.clientStatus]);

    const handleCall = () => {
        Linking.openURL('tel:1234567890');
    };

    const handleMessage = () => {
        router.push({
            pathname: '/chat',
            params: { recipientName: trip.driver?.fullName || 'Driver' }
        });
    };

    const handleTripDetails = () => {
        if (trip.tripId) {
            router.push({ pathname: '/modal', params: { type: 'trip_details', id: trip.tripId } });
        }
    };

    const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)';

    return (
        <View style={styles.container}>
            {/* Live status banner */}
            <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.statusBannerContainer}>
                <BlurView
                    intensity={70}
                    tint={isDark ? 'dark' : 'light'}
                    style={[styles.statusBanner, { backgroundColor: statusInfo.color + '15' }]}
                >
                    <View style={[styles.statusPulse, { backgroundColor: statusInfo.color }]} />
                    <View style={styles.statusContent}>
                        <Text style={[styles.statusTitle, { color: statusInfo.color }]}>{statusInfo.text}</Text>
                        <Text style={[styles.statusSubtext, { color: theme.textSecondary }]}>{statusInfo.subtext}</Text>
                    </View>
                </BlurView>
            </Animated.View>

            {/* Driver card */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.driverCardContainer}>
                <BlurView
                    intensity={80}
                    tint={isDark ? 'dark' : 'light'}
                    style={[styles.driverCard, { backgroundColor: cardBg }]}
                >
                    {/* Driver info row */}
                    <View style={styles.driverRow}>
                        {trip.driver?.photoURL ? (
                            <Image
                                source={{ uri: trip.driver.photoURL }}
                                style={styles.driverAvatar}
                                contentFit="cover"
                                transition={300}
                            />
                        ) : (
                            <View style={[styles.driverAvatar, { backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={styles.driverAvatarText}>
                                    {trip.driver?.fullName?.charAt(0)?.toUpperCase() || 'D'}
                                </Text>
                            </View>
                        )}

                        <View style={styles.driverInfo}>
                            <Text style={[styles.driverName, { color: theme.text }]}>
                                {trip.driver?.fullName || 'Your Driver'}
                            </Text>
                            <Text style={[styles.driverSubtext, { color: theme.textSecondary }]}>
                                Driver • {trip.tripStatus || 'Active'}
                            </Text>
                        </View>

                        <View style={styles.driverActions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.secondary }]}
                                onPress={handleMessage}
                                activeOpacity={0.8}
                            >
                                <MessageCircle size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                                onPress={handleCall}
                                activeOpacity={0.8}
                            >
                                <Phone size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Route summary */}
                    <View style={[styles.routeSummary, { borderTopColor: theme.border + '30' }]}>
                        <View style={styles.routePoint}>
                            <View style={[styles.routeDot, { backgroundColor: theme.primary }]} />
                            <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>
                                {trip.startPoint.address || 'Pickup'}
                            </Text>
                        </View>
                        <View style={[styles.routeConnector, { backgroundColor: theme.border + '40' }]} />
                        <View style={styles.routePoint}>
                            <View style={[styles.routeSquare, { borderColor: '#10B981' }]} />
                            <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>
                                {trip.endPoint.address || 'Destination'}
                            </Text>
                        </View>
                    </View>

                    {/* Trip details button */}
                    <TouchableOpacity
                        style={[styles.detailsBtn, { backgroundColor: theme.primary + '10' }]}
                        onPress={handleTripDetails}
                        activeOpacity={0.7}
                    >
                        <Shield size={16} color={theme.primary} />
                        <Text style={[styles.detailsBtnText, { color: theme.primary }]}>View Full Trip Details</Text>
                    </TouchableOpacity>
                </BlurView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 75,
        left: 0,
        right: 0,
    },
    // Status banner
    statusBannerContainer: {
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 18,
        overflow: 'hidden',
    },
    statusPulse: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusContent: {
        flex: 1,
    },
    statusTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    statusSubtext: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    // Driver card
    driverCardContainer: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    driverCard: {
        borderRadius: 24,
        padding: 20,
        gap: 16,
        overflow: 'hidden',
        elevation: 8,
        boxShadow: '0px 8px 32px rgba(0,0,0,0.12)',
    },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    driverAvatar: {
        width: 52,
        height: 52,
        borderRadius: 18,
    },
    driverAvatarText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: 17,
        fontWeight: '800',
    },
    driverSubtext: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    driverActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
    },
    // Route summary
    routeSummary: {
        borderTopWidth: 1,
        paddingTop: 16,
        gap: 4,
    },
    routePoint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    routeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    routeSquare: {
        width: 10,
        height: 10,
        borderWidth: 2.5,
        borderRadius: 3,
    },
    routeConnector: {
        width: 2,
        height: 12,
        marginLeft: 4,
        borderRadius: 1,
    },
    routeText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    // Details button
    detailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
    },
    detailsBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
