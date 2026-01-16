import { useRouter } from 'expo-router';
import { Bell, Check, Clock, MapPin, MessageCircle, TrendingUp, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import RatingModal from '../../components/RatingModal';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { ClientRequest, useClientRequestStore } from '../../store/useClientRequestStore';
import { useRatingStore } from '../../store/useRatingStore';
import { useTripStore } from '../../store/useTripStore';
import { calculateDistance, estimateDuration, formatDuration } from '../../utils/location';

export default function DriverRequestsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { requests, updateRequestStatus } = useClientRequestStore();
    const driverTrips = useTripStore((state) => state.trips);
    const { addRating } = useRatingStore();

    const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'completed'>('pending');
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);

    const filteredRequests = requests.filter(r => r.status === activeTab);

    const handleAccept = (id: string) => {
        Alert.alert('Accept Request', 'Are you sure you want to accept this client?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Accept', onPress: () => updateRequestStatus(id, 'accepted') }
        ]);
    };

    const handleDecline = (id: string) => {
        Alert.alert('Decline Request', 'Are you sure you want to decline this client?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Decline', style: 'destructive', onPress: () => updateRequestStatus(id, 'declined') }
        ]);
    };

    const handleComplete = (request: ClientRequest) => {
        Alert.alert('Complete Trip', 'Mark this trip as completed?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Complete',
                onPress: () => {
                    updateRequestStatus(request.id, 'completed');
                    setSelectedRequest(request);
                    setRatingModalVisible(true);
                }
            }
        ]);
    };

    const submitRating = (rating: number, comment: string) => {
        if (selectedRequest && user) {
            addRating({
                tripId: selectedRequest.id,
                raterId: user.uid,
                targetId: selectedRequest.clientId,
                rating,
                comment,
            });
        }
    };

    const renderRequestItem = ({ item }: { item: ClientRequest }) => {
        const driverTrip = driverTrips.find(t => t.id === item.driverTripId);

        return (
            <View style={[styles.requestCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.clientHeader}>
                    <View style={[styles.avatar, { backgroundColor: theme.secondary + '20' }]}>
                        <User size={24} color={theme.secondary} />
                    </View>
                    <View style={styles.clientInfo}>
                        <Text style={[styles.clientName, { color: theme.text }]}>Client Name</Text>
                        <Text style={[styles.requestTime, { color: theme.icon }]}>Requested {new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                        <Text style={[styles.priceText, { color: theme.primary }]}>${item.proposedPrice}</Text>
                    </View>
                </View>

                <View style={styles.tripDetails}>
                    <View style={styles.detailItem}>
                        <Clock size={16} color={theme.icon} />
                        <Text style={[styles.detailText, { color: theme.text }]}>Start at: {item.preferredTime}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <MapPin size={16} color={theme.icon} />
                        <Text style={[styles.detailText, { color: theme.text }]}>Route: {driverTrip ? 'Your matched route' : 'Custom Route'}</Text>
                    </View>
                    {item.startPoint && item.endPoint && (
                        <View style={styles.detailItem}>
                            <TrendingUp size={16} color={theme.primary} />
                            <Text style={[styles.detailText, { color: theme.text, fontWeight: '600' }]}>
                                {calculateDistance(item.startPoint, item.endPoint)} km • {formatDuration(estimateDuration(calculateDistance(item.startPoint, item.endPoint)))} est.
                            </Text>
                        </View>
                    )}
                </View>

                {item.status === 'pending' && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton, { borderColor: theme.accent }]}
                            onPress={() => handleDecline(item.id)}
                        >
                            <X size={20} color={theme.accent} />
                            <Text style={[styles.actionText, { color: theme.accent }]}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton, { backgroundColor: theme.primary }]}
                            onPress={() => handleAccept(item.id)}
                        >
                            <Check size={20} color="#fff" />
                            <Text style={[styles.actionText, { color: '#fff' }]}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {item.status === 'accepted' && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.secondary }]}
                            onPress={() => router.push({
                                pathname: '/chat',
                                params: { requestId: item.id, recipientName: 'Client Name' }
                            })}
                        >
                            <MessageCircle size={20} color="#fff" />
                            <Text style={styles.messageButtonText}>Chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.primary }]}
                            onPress={() => handleComplete(item)}
                        >
                            <Check size={20} color="#fff" />
                            <Text style={styles.messageButtonText}>Finish</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {item.status === 'completed' && (
                    <View style={[styles.detailItem, { justifyContent: 'center', marginTop: 8 }]}>
                        <Check size={16} color={theme.primary} />
                        <Text style={[styles.detailText, { color: theme.primary, fontWeight: '700' }]}>Trip Completed</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Trip Requests</Text>

                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pending' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'pending' ? theme.primary : theme.icon }]}>Pending</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'accepted' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
                        onPress={() => setActiveTab('accepted')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'accepted' ? theme.primary : theme.icon }]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'completed' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
                        onPress={() => setActiveTab('completed')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'completed' ? theme.primary : theme.icon }]}>History</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderRequestItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Bell size={64} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>
                            No {activeTab} requests
                        </Text>
                    </View>
                }
            />

            <RatingModal
                visible={ratingModalVisible}
                onClose={() => setRatingModalVisible(false)}
                onSubmit={submitRating}
                title="Rate Client"
                recipientName="Client Name"
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
        paddingBottom: 0,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 20,
    },
    tabBar: {
        flexDirection: 'row',
        gap: 24,
    },
    tab: {
        paddingBottom: 12,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
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
    clientHeader: {
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
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 18,
        fontWeight: '600',
    },
    requestTime: {
        fontSize: 12,
    },
    priceContainer: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: '#0066FF10',
    },
    priceText: {
        fontSize: 18,
        fontWeight: '700',
    },
    tripDetails: {
        gap: 8,
        paddingVertical: 8,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    messageButton: {
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    messageButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    declineButton: {
        borderWidth: 1,
    },
    acceptButton: {
    },
    actionText: {
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
    },
});
