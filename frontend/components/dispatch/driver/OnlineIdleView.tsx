import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform, ScrollView, Image } from 'react-native';
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Wifi, Coffee, Star, Wallet, Calendar, Users, User, Send, Check } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';
import { useCountdownDate } from '../../../hooks/useCountdown';
import { useInvitePassenger } from '../../../hooks/api/useTripQueries';

interface Props {
    onGoOffline: () => void;
    onTakeBreak: () => void;
    stats?: {
        rating: number;
        weeklyPotential: number;
        nextTripDate: Date | null;
        nextTripRef: any;
    };
    matchedClients?: any[];
    activeRoute?: any;
}

export default function OnlineIdleView({ onGoOffline, onTakeBreak, stats, matchedClients, activeRoute }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const nextTripCountdown = useCountdownDate(stats?.nextTripDate || null);
    const invitePassenger = useInvitePassenger();

    // Pulsing animation for "listening" indicator
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0.6);

    useEffect(() => {
        pulseScale.value = withRepeat(
            withTiming(2.2, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1, false
        );
        pulseOpacity.value = withRepeat(
            withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1, false
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }));

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
                {/* Pulsing indicator */}
                <View style={styles.pulseWrapper}>
                    <Animated.View style={[styles.pulseRing, pulseStyle]} />
                    <View style={[styles.statusDot, { backgroundColor: '#10b981' }]}>
                        <Wifi size={24} color="#fff" />
                    </View>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>You're Online</Text>
                
                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Star size={16} color="#F59E0B" />
                        <Text style={[styles.statValue, { color: theme.text }]}>{stats?.rating ? stats.rating.toFixed(1) : 'New'}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rating</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Wallet size={16} color="#10b981" />
                        <Text style={[styles.statValue, { color: theme.text }]}>{stats?.weeklyPotential || 0} MAD</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Weekly</Text>
                    </View>
                </View>

                {/* Next Trip / Active Route Alert */}
                {stats?.nextTripRef && (
                    <View style={[styles.nextTripCard, { backgroundColor: theme.surfaceHighlight + '40' }]}>
                        <Calendar size={18} color={theme.primary} />
                        <View style={styles.nextTripInfo}>
                            <Text style={[styles.nextTripTitle, { color: theme.text }]}>
                                {stats.nextTripRef.isRouteOnly ? 'Active Route • Waiting for Clients' : `Next Trip in ${nextTripCountdown}`}
                            </Text>
                            <Text style={[styles.nextTripSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                {(stats.nextTripRef.routeId?.startPoint?.address || 'Start').split(',')[0]} → {(stats.nextTripRef.routeId?.endPoint?.address || 'Destination').split(',')[0]}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Clients on Route Section */}
                {matchedClients !== undefined && (
                    <View style={styles.clientsSection}>
                        <View style={styles.clientsHeader}>
                            <Users size={16} color={theme.primary} />
                            <Text style={[styles.clientsTitle, { color: theme.text }]}>
                                Clients on Your Route ({matchedClients.length})
                            </Text>
                        </View>

                        {matchedClients.length === 0 ? (
                            <View style={styles.noClientsBox}>
                                <Text style={[styles.noClientsText, { color: theme.textSecondary }]}>
                                    Scanning for passengers along your route...
                                </Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.clientsList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                {matchedClients.map((matchItem: any, idx: number) => {
                                    const r = matchItem.route || matchItem;
                                    const clientUser = r.userId;
                                    const clientName = clientUser?.fullName || `Passenger #${idx + 1}`;
                                    const pickupAddr = r.startPoint?.address ? r.startPoint.address.split(',')[0] : 'Current location';
                                    const dropoffAddr = r.endPoint?.address ? r.endPoint.address.split(',')[0] : 'Destination';
                                    const fare = r.price?.amount ?? r.price ?? 15;
                                    const isPending = matchItem.requestStatus === 'pending' || matchItem.requestStatus === 'DRIVER_PROPOSED';
                                    const isAccepted = matchItem.requestStatus === 'accepted' || matchItem.requestStatus === 'ACCEPTED';
                                    const clientRouteId = r.id || r._id;
                                    const tripId = matchItem.tripId || matchItem.trip?.id;

                                    return (
                                        <View key={clientRouteId || idx} style={[styles.clientCard, { backgroundColor: theme.surfaceHighlight + '20', borderColor: theme.border }]}>
                                            <View style={styles.clientCardHeader}>
                                                <View style={[styles.clientAvatar, { backgroundColor: theme.primary }]}>
                                                    {clientUser?.photoURL ? (
                                                        <Image source={{ uri: clientUser.photoURL }} style={styles.avatarImg} />
                                                    ) : (
                                                        <User size={16} color="#fff" />
                                                    )}
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                    <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>
                                                        {clientName}
                                                    </Text>
                                                    <Text style={[styles.clientAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                                                        {pickupAddr} → {dropoffAddr}
                                                    </Text>
                                                </View>
                                                <View style={styles.clientFareBadge}>
                                                    <Text style={styles.clientFareText}>{fare} MAD</Text>
                                                </View>
                                            </View>

                                            <View style={styles.clientCardActions}>
                                                {isAccepted ? (
                                                    <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                                                        <Check size={12} color="#15803d" />
                                                        <Text style={{ color: '#15803d', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Joined Trip</Text>
                                                    </View>
                                                ) : isPending ? (
                                                    <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                                                        <Text style={{ color: '#b45309', fontWeight: '700', fontSize: 12 }}>Invitation Sent</Text>
                                                    </View>
                                                ) : (
                                                    <TouchableOpacity
                                                        style={[styles.inviteBtn, { backgroundColor: theme.primary }]}
                                                        disabled={invitePassenger.isPending}
                                                        onPress={() => {
                                                            if (clientRouteId) {
                                                                invitePassenger.mutate({
                                                                    clientRouteId,
                                                                    tripId,
                                                                    driverRouteId: activeRoute?._id || activeRoute?.id,
                                                                    proposedPrice: fare
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <Send size={12} color="#fff" />
                                                        <Text style={styles.inviteBtnText}>Invite Passenger</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}
                        onPress={onTakeBreak}
                        activeOpacity={0.7}
                    >
                        <Coffee size={18} color="#f59e0b" />
                        <Text style={[styles.actionText, { color: '#f59e0b' }]}>Take Break</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                        onPress={onGoOffline}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.actionText, { color: '#ef4444' }]}>Go Offline</Text>
                    </TouchableOpacity>
                </View>
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        paddingBottom: 20, // To give it some space at bottom
    },
    container: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    pulseWrapper: {
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    pulseRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#10b981',
    },
    statusDot: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: 'rgba(156, 163, 175, 0.05)',
        borderRadius: 16,
        paddingVertical: 16,
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
        gap: 4,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(156, 163, 175, 0.2)',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    nextTripCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        marginBottom: 24,
        gap: 12,
    },
    nextTripInfo: {
        flex: 1,
    },
    nextTripTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    nextTripSub: {
        fontSize: 13,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    actionText: {
        fontWeight: '700',
        fontSize: 14,
    },
    // Clients Section Styles
    clientsSection: {
        width: '100%',
        marginBottom: 20,
    },
    clientsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    clientsTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    noClientsBox: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(156, 163, 175, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noClientsText: {
        fontSize: 12,
        fontWeight: '500',
    },
    clientsList: {
        maxHeight: 180,
        width: '100%',
    },
    clientCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 8,
        gap: 10,
    },
    clientCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clientAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    clientName: {
        fontSize: 13,
        fontWeight: '700',
    },
    clientAddress: {
        fontSize: 11,
        marginTop: 2,
    },
    clientFareBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    clientFareText: {
        color: '#10b981',
        fontSize: 12,
        fontWeight: '800',
    },
    clientCardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    inviteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    inviteBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});
