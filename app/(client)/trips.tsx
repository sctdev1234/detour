import { useRouter } from 'expo-router';
import { Calendar, Clock, MapPin, MessageCircle, Star, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import RatingModal from '../../components/RatingModal';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { ClientRequest, useClientRequestStore } from '../../store/useClientRequestStore';
import { useRatingStore } from '../../store/useRatingStore';
import { useTripStore } from '../../store/useTripStore';
import { calculateDistance, estimateDuration, formatDuration } from '../../utils/location';

export default function ClientTripsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { requests, removeRequest } = useClientRequestStore();
    const driverTrips = useTripStore((state) => state.trips);
    const { addRating } = useRatingStore();

    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);

    // Watch for completed trips that haven't been rated yet
    useEffect(() => {
        const completedUnrated = requests.find(r => r.status === 'completed');
        if (completedUnrated && !ratingModalVisible) {
            setSelectedRequest(completedUnrated);
            // In a real app, we'd check if a rating already exists for this tripId
            setRatingModalVisible(true);
        }
    }, [requests, ratingModalVisible]);

    const submitRating = (rating: number, comment: string) => {
        if (selectedRequest && user) {
            addRating({
                tripId: selectedRequest.id,
                raterId: user.uid,
                targetId: selectedRequest.driverTripId || 'demo_driver', // Simplified for demo
                rating,
                comment,
            });
        }
        setRatingModalVisible(false);
    };

    const renderRequestItem = ({ item }: { item: ClientRequest }) => {
        const driverTrip = driverTrips.find(t => t.id === item.driverTripId);

        const getStatusColor = (status: string) => {
            switch (status) {
                case 'accepted': return '#4CD964';
                case 'completed': return theme.primary;
                case 'declined': return '#FF3B30';
                default: return '#FFCC00';
            }
        };

        return (
            <View style={[styles.requestCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeRequest(item.id)}>
                        <Trash2 size={18} color={theme.accent} />
                    </TouchableOpacity>
                </View>

                <View style={styles.routeBox}>
                    <View style={styles.routeItem}>
                        <MapPin size={16} color={theme.primary} />
                        <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>Requested Route</Text>
                    </View>
                    <View style={styles.routeDetails}>
                        <View style={styles.detailItem}>
                            <Clock size={14} color={theme.icon} />
                            <Text style={[styles.detailText, { color: theme.icon }]}>{item.preferredTime}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Calendar size={14} color={theme.icon} />
                            <Text style={[styles.detailText, { color: theme.icon }]}>{item.days.length} days/week</Text>
                        </View>
                        {item.startPoint && item.endPoint && (
                            <View style={styles.detailItem}>
                                <Clock size={14} color={theme.primary} />
                                <Text style={[styles.detailText, { color: theme.primary, fontWeight: '600' }]}>
                                    {formatDuration(estimateDuration(calculateDistance(item.startPoint, item.endPoint)))} travel
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {item.status === 'accepted' && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.messageButton, { backgroundColor: theme.secondary, flex: 1 }]}
                            onPress={() => router.push({
                                pathname: '/chat',
                                params: { requestId: item.id, recipientName: 'Driver Name' }
                            })}
                        >
                            <MessageCircle size={18} color="#fff" />
                            <Text style={styles.messageButtonText}>Message</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.messageButton, { backgroundColor: theme.primary, flex: 1 }]}
                            onPress={() => router.push({
                                pathname: '/(client)/trip-details',
                                params: { requestId: item.id }
                            })}
                        >
                            <MapPin size={18} color="#fff" />
                            <Text style={styles.messageButtonText}>Track</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {item.status === 'completed' && (
                    <TouchableOpacity
                        style={[styles.messageButton, { borderColor: theme.primary, borderWidth: 1, flex: 1 }]}
                        onPress={() => {
                            setSelectedRequest(item);
                            setRatingModalVisible(true);
                        }}
                    >
                        <Star size={18} color={theme.primary} fill={theme.primary} />
                        <Text style={[styles.messageButtonText, { color: theme.primary }]}>Rate Experience</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.cardFooter}>
                    <Text style={[styles.priceLabel, { color: theme.icon }]}>Proposed Price:</Text>
                    <Text style={[styles.priceValue, { color: theme.primary }]}>${item.proposedPrice}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>My Trips</Text>
            </View>

            <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                renderItem={renderRequestItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Calendar size={64} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>You haven't requested any trips yet</Text>
                        <TouchableOpacity
                            style={[styles.findButton, { backgroundColor: theme.primary }]}
                            onPress={() => router.push('/(client)/search')}
                        >
                            <Text style={styles.findButtonText}>Find a Ride</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            <RatingModal
                visible={ratingModalVisible}
                onClose={() => setRatingModalVisible(false)}
                onSubmit={submitRating}
                title="Rate your Driver"
                recipientName="Driver Name"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingTop: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
    },
    listContent: {
        padding: 24,
        gap: 16,
    },
    requestCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        gap: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    routeBox: {
        gap: 12,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    routeText: {
        fontSize: 18,
        fontWeight: '600',
    },
    routeDetails: {
        flexDirection: 'row',
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 13,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    priceLabel: {
        fontSize: 14,
    },
    priceValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 16,
        gap: 8,
    },
    messageButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 20,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
    findButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 28,
    },
    findButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    }
});
