import { useRouter } from 'expo-router';
import { Box, Calendar, Clock, MapPin, MessageCircle, Star, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
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

    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);

    const checkStatus = (status: string) => {
        if (activeTab === 'current') {
            return ['pending', 'accepted', 'started'].includes(status);
        } else {
            return ['completed', 'declined', 'cancelled'].includes(status);
        }
    };

    const filteredRequests = requests.filter(r => checkStatus(r.status));

    // Watch for completed trips that haven't been rated yet
    useEffect(() => {
        const completedUnrated = requests.find(r => r.status === 'completed');
        if (completedUnrated && !ratingModalVisible) {
            setSelectedRequest(completedUnrated);
            setRatingModalVisible(true);
        }
    }, [requests, ratingModalVisible]);

    const submitRating = (rating: number, comment: string) => {
        if (selectedRequest && user) {
            addRating({
                tripId: selectedRequest.id,
                raterId: user.id,
                targetId: selectedRequest.driverTripId || 'demo_driver',
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
                case 'accepted': return '#22c55e';
                case 'started': return theme.primary;
                case 'completed': return '#22c55e';
                case 'declined': return '#ef4444';
                default: return '#eab308';
            }
        };

        return (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                    {(item.status === 'pending' || item.status === 'declined') && (
                        <TouchableOpacity onPress={() => removeRequest(item.id)} style={styles.deleteButton}>
                            <Trash2 size={16} color={theme.accent} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.routeRow}>
                        <View style={styles.routeNode}>
                            <Text style={[styles.timeText, { color: theme.text }]}>{item.preferredTime}</Text>
                        </View>
                        <View style={styles.connector}>
                            <View style={[styles.line, { backgroundColor: theme.border }]} />
                        </View>
                        <View style={styles.routeNode}>
                            <Text style={[styles.locationText, { color: theme.text }]}>Driver Route</Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Calendar size={14} color={theme.icon} />
                            <Text style={[styles.statText, { color: theme.icon }]}>{item.days.length} days/week</Text>
                        </View>
                        {item.startPoint && item.endPoint && (
                            <View style={styles.stat}>
                                <Clock size={14} color={theme.icon} />
                                <Text style={[styles.statText, { color: theme.icon }]}>
                                    {formatDuration(estimateDuration(calculateDistance(item.startPoint, item.endPoint)))}
                                </Text>
                            </View>
                        )}
                        <View style={styles.stat}>
                            <Text style={[styles.priceText, { color: theme.primary }]}>${item.proposedPrice}</Text>
                        </View>
                    </View>
                </View>

                {(item.status === 'accepted' || item.status === 'started') && (
                    <View style={[styles.actionsFooter, { borderTopColor: theme.border }]}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push({
                                pathname: '/chat',
                                params: { requestId: item.id, recipientName: 'Driver Name' }
                            })}
                        >
                            <MessageCircle size={18} color={theme.text} />
                            <Text style={[styles.actionText, { color: theme.text }]}>Message</Text>
                        </TouchableOpacity>

                        <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push({
                                pathname: '/(client)/trip-details',
                                params: { requestId: item.id }
                            })}
                        >
                            <MapPin size={18} color={theme.primary} />
                            <Text style={[styles.actionText, { color: theme.primary, fontWeight: '700' }]}>Track Ride</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {item.status === 'completed' && (
                    <TouchableOpacity
                        style={[styles.rateButton, { backgroundColor: theme.primary }]}
                        onPress={() => {
                            setSelectedRequest(item);
                            setRatingModalVisible(true);
                        }}
                    >
                        <Star size={16} color="#fff" fill="#fff" />
                        <Text style={styles.rateButtonText}>Rate Trip</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>My Trips</Text>
            </View>

            {/* Custom Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: theme.surface }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'current' && { backgroundColor: theme.background, boxShadow: '0px 2px 4px rgba(0,0,0,0.1)', elevation: 3 }]}
                    onPress={() => setActiveTab('current')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'current' ? theme.text : theme.icon }]}>Active & Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && { backgroundColor: theme.background, boxShadow: '0px 2px 4px rgba(0,0,0,0.1)', elevation: 3 }]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'history' ? theme.text : theme.icon }]}>History</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderRequestItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Box size={48} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>
                            No {activeTab === 'current' ? 'active' : 'historical'} trips found
                        </Text>
                        {activeTab === 'current' && (
                            <TouchableOpacity
                                style={[styles.findButton, { backgroundColor: theme.primary }]}
                                onPress={() => router.push('/(client)/search')}
                            >
                                <Text style={styles.findButtonText}>Find a Ride</Text>
                            </TouchableOpacity>
                        )}
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
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        padding: 4,
        borderRadius: 12,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 16,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    deleteButton: {
        padding: 4,
    },
    cardContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    routeNode: {
        flex: 1,
    },
    timeText: {
        fontSize: 18,
        fontWeight: '700',
    },
    locationText: {
        fontSize: 14,
        fontWeight: '500',
    },
    connector: {
        width: 32,
        alignItems: 'center',
    },
    line: {
        flex: 1,
        height: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 12,
        fontWeight: '500',
    },
    priceText: {
        fontSize: 18,
        fontWeight: '700',
    },
    actionsFooter: {
        flexDirection: 'row',
        borderTopWidth: 1,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    verticalDivider: {
        width: 1,
        marginVertical: 8,
    },
    rateButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 8,
        margin: 16,
        marginTop: 0,
        borderRadius: 16,
    },
    rateButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
    },
    findButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
    },
    findButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
