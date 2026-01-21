import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import MapPicker from '../../components/MapPicker';
import { Colors } from '../../constants/theme';
import { useClientRequestStore } from '../../store/useClientRequestStore';
import { useTrackingStore } from '../../store/useTrackingStore';
import { useTripStore } from '../../store/useTripStore';
import { calculateDistance, estimateDuration, formatDuration } from '../../utils/location';

export default function TripDetailsScreen() {
    const { requestId } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const request = useClientRequestStore(state => state.requests.find(r => r.id === requestId));
    const driverTrip = useTripStore(state => state.trips.find(t => t.id === request?.driverTripId));

    const { subscribeToDriver, unsubscribe, driverLocation } = useTrackingStore();
    const [alerted, setAlerted] = React.useState(false);

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
            const eta = estimateDuration(dist, 40); // 40km/h avg

            if (eta <= 5 && !alerted) {
                setAlerted(true);
                import('../../services/notificationService').then(({ sendImmediateNotification }) => {
                    sendImmediateNotification('Arriving Soon', `Driver is ${eta} minutes away!`);
                });
            }
        }
    }, [driverLocation, request]);

    if (!request || !driverTrip) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.text }}>Trip not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: theme.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Trip Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Map Section */}
                <View style={styles.mapContainer}>
                    <MapPicker
                        theme={theme}
                        initialPoints={[request.startPoint, request.endPoint]}
                        driverLocation={driverLocation || undefined}
                        readOnly={true}
                    />
                </View>

                {/* Status Badge */}
                <View style={[styles.statusContainer, { backgroundColor: theme.surface }]}>
                    <View style={styles.statusRow}>
                        <Text style={[styles.statusLabel, { color: theme.icon }]}>Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: '#4CD96420' }]}>
                            <Text style={[styles.statusText, { color: '#4CD964' }]}>{request.status.toUpperCase()}</Text>
                        </View>
                    </View>

                    {driverLocation && (
                        <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1, padding: 12, backgroundColor: theme.background, borderRadius: 12, alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: theme.icon }}>Dist. to Pickup</Text>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
                                    {calculateDistance(
                                        { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                                        request.startPoint
                                    )} km
                                </Text>
                            </View>
                            <View style={{ flex: 1, padding: 12, backgroundColor: theme.background, borderRadius: 12, alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: theme.icon }}>Est. Arrival</Text>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.primary }}>
                                    {formatDuration(estimateDuration(calculateDistance(
                                        { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                                        request.startPoint
                                    ), 40))}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Driver Info */}
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Driver</Text>
                    <View style={styles.driverRow}>
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                            <Text style={styles.avatarText}>D</Text>
                        </View>
                        <View style={styles.driverInfo}>
                            <Text style={[styles.driverName, { color: theme.text }]}>Driver Name</Text>
                            <Text style={[styles.driverCar, { color: theme.icon }]}>Toyota Corolla • White</Text>
                        </View>
                        <View style={styles.driverActions}>
                            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.secondary }]}>
                                <MessageCircle size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.primary }]}>
                                <Phone size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Route Info */}
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Route</Text>
                    <View style={styles.timeline}>
                        <View style={styles.timelineItem}>
                            <MapPin size={16} color={theme.primary} />
                            <Text style={[styles.timelineText, { color: theme.text }]}>Pickup Point</Text>
                            <Text style={[styles.timelineTime, { color: theme.icon }]}>{request.preferredTime}</Text>
                        </View>
                        <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                        <View style={styles.timelineItem}>
                            <MapPin size={16} color={theme.accent} />
                            <Text style={[styles.timelineText, { color: theme.text }]}>Dropoff Point</Text>
                            <Text style={[styles.timelineTime, { color: theme.icon }]}>~ 45 min</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        paddingBottom: 40,
    },
    mapContainer: {
        height: 300,
        marginHorizontal: 20,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
    },
    statusContainer: {
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    card: {
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
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
        marginBottom: 4,
    },
    driverCar: {
        fontSize: 14,
    },
    driverActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeline: {
        gap: 4,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timelineLine: {
        width: 2,
        height: 20,
        marginLeft: 7,
        marginVertical: 4,
    },
    timelineText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    timelineTime: {
        fontSize: 13,
    },
});
