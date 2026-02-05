import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Maximize2, MessageCircle, Phone, Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import MapPicker from '../../components/MapPicker';
import { Colors } from '../../constants/theme';
import { useClientRequestStore } from '../../store/useClientRequestStore';
import { useTrackingStore } from '../../store/useTrackingStore';
import { useTripStore } from '../../store/useTripStore';
import { useUIStore } from '../../store/useUIStore';
import { calculateDistance, estimateDuration, formatDuration } from '../../utils/location';

export default function TripDetailsScreen() {
    const { requestId } = useLocalSearchParams<{ requestId: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { showToast } = useUIStore();

    const request = useClientRequestStore(state => state.requests.find(r => r.id === requestId));
    const driverTrip = useTripStore(state => state.trips.find(t => t.id === request?.driverTripId));

    const { subscribeToDriver, unsubscribe, driverLocation } = useTrackingStore();
    const [alerted, setAlerted] = useState(false);
    const [isExpandedMap, setIsExpandedMap] = useState(false);

    useEffect(() => {
        if (driverTrip?.driverId) {
            subscribeToDriver(driverTrip.driverId);
        }
        return () => unsubscribe();
    }, [driverTrip?.driverId]);

    useEffect(() => {
        if (driverLocation && request) {
            const dist = calculateDistance(
                { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                request.startPoint
            );
            const eta = estimateDuration(dist, 40);

            if (eta <= 5 && !alerted) {
                setAlerted(true);
                import('../../services/notificationService').then(({ sendImmediateNotification }) => {
                    sendImmediateNotification('Arriving Soon', `Driver is ${Math.ceil(eta)} minutes away!`);
                });
            }
        }
    }, [driverLocation, request, alerted]);

    const handleCall = () => {
        Linking.openURL('tel:1234567890'); // Replace with real driver number
    };

    const handleMessage = () => {
        router.push({
            pathname: '/chat',
            params: { requestId: request?.id, recipientName: 'Driver Name' } // Replace with real name
        });
    };

    const handleShareTrip = async () => {
        try {
            await Share.share({
                message: `Track my trip on Detour! I'm on my way from ${request?.startPoint ? 'Pickup' : 'Start'} to ${request?.endPoint ? 'Dropoff' : 'End'}. \n\nDriver: Driver Name`,
            });
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    if (!request || !driverTrip) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.text, marginBottom: 16 }}>Trip details unavailable.</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>Return Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const distToPickup = driverLocation ? calculateDistance(
        { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
        request.startPoint
    ) : 0;

    const etaMins = estimateDuration(distToPickup, 40);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: isExpandedMap ? 'transparent' : theme.background }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backButton, { backgroundColor: theme.surface }]}
                >
                    <ArrowLeft size={24} color={theme.text} />
                </TouchableOpacity>
                {!isExpandedMap && <Text style={[styles.title, { color: theme.text }]}>Trip Details</Text>}
                <TouchableOpacity
                    onPress={() => setIsExpandedMap(!isExpandedMap)}
                    style={[styles.backButton, { backgroundColor: theme.surface }]}
                >
                    <Maximize2 size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            {/* Map Background Layer */}
            <View style={[styles.mapLayer, { height: isExpandedMap ? '100%' : '45%' }]}>
                <MapPicker
                    theme={theme}
                    initialPoints={[request.startPoint, request.endPoint]}
                    driverLocation={driverLocation || undefined}
                    readOnly={true}
                />
            </View>

            {/* Content Layer */}
            {!isExpandedMap && (
                <View style={[styles.contentLayer, { backgroundColor: theme.background }]}>
                    <View style={styles.dragHandle} />

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Status Card */}
                        <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
                            <View style={styles.statusHeader}>
                                <Text style={[styles.statusLabel, { color: theme.icon }]}>Current Status</Text>
                                <View style={[styles.statusBadge, { backgroundColor: '#22c55e20' }]}>
                                    <Text style={[styles.statusText, { color: '#22c55e' }]}>{request.status.toUpperCase()}</Text>
                                </View>
                            </View>

                            {/* Live Stats */}
                            <View style={styles.liveStats}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: theme.text }]}>
                                        {driverLocation ? `${distToPickup.toFixed(1)} km` : '--'}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: theme.icon }]}>Distance</Text>
                                </View>
                                <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: theme.primary }]}>
                                        {driverLocation ? formatDuration(etaMins) : '--'}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: theme.icon }]}>ETA</Text>
                                </View>
                            </View>
                        </View>

                        {/* Driver Card */}
                        <View style={[styles.driverCard, { backgroundColor: theme.surface }]}>
                            <View style={styles.driverRow}>
                                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                                    <Text style={styles.avatarText}>D</Text>
                                </View>
                                <View style={styles.driverInfo}>
                                    <Text style={[styles.driverName, { color: theme.text }]}>Driver Name</Text>
                                    <View style={styles.ratingRow}>
                                        <Text style={[styles.carText, { color: theme.icon }]}>Toyota Camry • ABC-123</Text>
                                    </View>
                                </View>
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[styles.btn, { backgroundColor: theme.secondary }]}
                                        onPress={handleMessage}
                                    >
                                        <MessageCircle size={20} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.btn, { backgroundColor: theme.primary }]}
                                        onPress={handleCall}
                                    >
                                        <Phone size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Timeline */}
                        <View style={[styles.tripCard, { backgroundColor: theme.surface }]}>
                            <View style={styles.timelineItem}>
                                <View style={styles.timelineIconContainer}>
                                    <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                                    <View style={[styles.line, { backgroundColor: theme.border }]} />
                                </View>
                                <View style={styles.timelineContent}>
                                    <Text style={[styles.timelineTitle, { color: theme.text }]}>Pickup</Text>
                                    <Text style={[styles.timelineTime, { color: theme.icon }]}>{request.preferredTime}</Text>
                                </View>
                            </View>
                            <View style={styles.timelineItem}>
                                <View style={styles.timelineIconContainer}>
                                    <View style={[styles.square, { borderColor: theme.text }]} />
                                </View>
                                <View style={styles.timelineContent}>
                                    <Text style={[styles.timelineTitle, { color: theme.text }]}>Dropoff</Text>
                                    <Text style={[styles.timelineTime, { color: theme.icon }]}>Approx. 45 min trip</Text>
                                </View>
                            </View>
                        </View>

                        {/* Safety Section */}
                        <TouchableOpacity
                            style={[styles.safetyCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}
                            onPress={handleShareTrip}
                        >
                            <Share2 size={24} color={theme.primary} />
                            <View>
                                <Text style={[styles.safetyTitle, { color: theme.text }]}>Share Trip Status</Text>
                                <Text style={[styles.safetyDesc, { color: theme.icon }]}>Send live location to friends</Text>
                            </View>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    mapLayer: {
        width: '100%',
    },
    contentLayer: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -32,
        elevation: 5,
        boxShadow: '0px -4px 12px rgba(0,0,0,0.1)',
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#e5e5e5',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    scrollContent: {
        padding: 24,
        gap: 20,
    },
    statusCard: {
        padding: 20,
        borderRadius: 24,
        gap: 20,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    liveStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    verticalDivider: {
        width: 1,
        height: 40,
    },
    driverCard: {
        padding: 16,
        borderRadius: 24,
    },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    carText: {
        fontSize: 13,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    btn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tripCard: {
        padding: 20,
        borderRadius: 24,
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 16,
        height: 50,
    },
    timelineIconContainer: {
        alignItems: 'center',
        width: 20,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    line: {
        width: 2,
        flex: 1,
        marginVertical: 4,
    },
    square: {
        width: 12,
        height: 12,
        borderWidth: 2,
    },
    timelineContent: {
        flex: 1,
        justifyContent: 'flex-start',
        marginTop: -4,
    },
    timelineTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    timelineTime: {
        fontSize: 13,
        marginTop: 2,
    },
    safetyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        gap: 16,
    },
    safetyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    safetyDesc: {
        fontSize: 13,
    }
});
