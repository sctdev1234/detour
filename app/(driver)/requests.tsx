import { useRouter } from 'expo-router';
import { ArrowLeft, Ban, Calendar, Check, Clock, MessageCircle, User } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { ClientRequest, useClientRequestStore } from '../../store/useClientRequestStore';
import { useTripStore } from '../../store/useTripStore';

export default function DriverRequestsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();

    // In a real app, filter requests for THIS driver's trips
    // For manual testing, we might need to handle the filtering logic carefully
    const driverTrips = useTripStore(state => state.trips.filter(t => t.driverId === user?.uid));
    const requests = useClientRequestStore((state) => state.requests);
    const updateRequestStatus = useClientRequestStore((state) => state.updateRequestStatus);

    const pendingRequests = requests.filter(r => r.status === 'pending');

    const handleAccept = (request: ClientRequest) => {
        updateRequestStatus(request.id, 'accepted');
        // Ideally should check for conflicts / capacity here
    };

    const handleDecline = (request: ClientRequest) => {
        updateRequestStatus(request.id, 'declined');
    };

    const renderRequest = ({ item }: { item: ClientRequest }) => {
        return (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Header: Passenger Info */}
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                            {/* Ideally, we'd fetch the user's photo here if we had a Users store */}
                            <User size={24} color={theme.primary} />
                        </View>
                        <View>
                            <Text style={[styles.userName, { color: theme.text }]}>Passenger Request</Text>
                            <Text style={[styles.timestamp, { color: theme.icon }]}>Received just now</Text>
                        </View>
                    </View>
                    <View style={[styles.priceTag, { backgroundColor: theme.primary + '15' }]}>
                        <Text style={[styles.priceText, { color: theme.primary }]}>${item.proposedPrice}</Text>
                    </View>
                </View>

                {/* Route Details */}
                <View style={styles.routeContainer}>
                    <View style={styles.connector}>
                        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                        <View style={[styles.line, { backgroundColor: theme.border }]} />
                        <View style={[styles.square, { borderColor: theme.text }]} />
                    </View>
                    <View style={styles.locations}>
                        <View style={styles.locationItem}>
                            <Text style={[styles.locationLabel, { color: theme.icon }]}>Pickup</Text>
                            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                                {item.startPoint ? `${item.startPoint.latitude.toFixed(4)}, ${item.startPoint.longitude.toFixed(4)}` : 'On Route'}
                            </Text>
                        </View>
                        <View style={{ height: 16 }} />
                        <View style={styles.locationItem}>
                            <Text style={[styles.locationLabel, { color: theme.icon }]}>Dropoff</Text>
                            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                                {item.endPoint ? `${item.endPoint.latitude.toFixed(4)}, ${item.endPoint.longitude.toFixed(4)}` : 'On Route'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Meta Info */}
                <View style={[styles.metaRow, { backgroundColor: theme.background }]}>
                    <View style={styles.metaItem}>
                        <Clock size={16} color={theme.icon} />
                        <Text style={[styles.metaText, { color: theme.text }]}>{item.preferredTime}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Calendar size={16} color={theme.icon} />
                        <Text style={[styles.metaText, { color: theme.text }]}>{item.days.join(', ')}</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}
                        onPress={() => handleDecline(item)}
                    >
                        <Ban size={20} color="#ef4444" />
                        <Text style={[styles.actionText, { color: '#ef4444' }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#22c55e', flex: 2 }]}
                        onPress={() => handleAccept(item)}
                    >
                        <Check size={20} color="#fff" />
                        <Text style={[styles.actionText, { color: '#fff' }]}>Accept Request</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surface }]}>
                    <ArrowLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Requests</Text>
                <View style={{ width: 44 }} />
            </View>

            <FlatList
                data={pendingRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderRequest}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MessageCircle size={64} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>No pending requests.</Text>
                        <Text style={[styles.emptySubtext, { color: theme.icon }]}>Enjoy your free time!</Text>
                    </View>
                }
            />
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
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
        gap: 20,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 20,
        gap: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    userInfo: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
    },
    timestamp: {
        fontSize: 12,
        marginTop: 2,
    },
    priceTag: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    priceText: {
        fontSize: 16,
        fontWeight: '700',
    },
    routeContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    connector: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    line: {
        width: 2,
        flex: 1,
        marginVertical: 4,
    },
    square: {
        width: 10,
        height: 10,
        borderWidth: 2,
    },
    locations: {
        flex: 1,
        justifyContent: 'space-between',
    },
    locationItem: {
        height: 40,
        justifyContent: 'center',
    },
    locationLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    locationText: {
        fontSize: 15,
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    actionBtn: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        fontSize: 15,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptySubtext: {
        fontSize: 14,
    },
});
