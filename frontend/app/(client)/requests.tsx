
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Send, User } from 'lucide-react-native';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DetourMap from '../../components/Map';
import { Colors } from '../../constants/theme';
import { useReclamations } from '../../hooks/api/useReclamationQueries';
import { useClientRequests, useHandleJoinRequest } from '../../hooks/api/useTripQueries';
import { normalizeRoute } from '../../utils/location';

export default function ClientRequestsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { data: clientRequests, isLoading } = useClientRequests();
    const { data: reclamations, refetch } = useReclamations();
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [])
    );

    const renderRequestItem = ({ item, index }: { item: any, index: number }) => {
        const driver = item.tripId?.driverId;
        const normalizedDriverRoute = normalizeRoute(item.tripId?.routeId);
        const normalizedClientRoute = normalizeRoute(item.clientRouteId);

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={styles.reqCardWrapper}
            >
                <BlurView intensity={20} tint="light" style={styles.reqCard}>
                    <View style={styles.driverInfo}>
                        {driver?.photoURL ? (
                            <Image source={{ uri: driver.photoURL }} style={styles.avatar} contentFit="cover" transition={500} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
                                <User size={24} color={theme.icon} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.driverName, { color: theme.text }]}>{driver?.fullName || 'Anonymous Driver'}</Text>
                            <View style={styles.statusRow}>
                                <Text style={[styles.statusText, { color: theme.icon }]}>
                                    Status: {item.status.toUpperCase()}
                                </Text>
                            </View>
                            {item.proposedPrice && (
                                <Text style={{ color: theme.primary, fontWeight: '700', marginTop: 4 }}>
                                    Offer: {item.proposedPrice} MAD
                                </Text>
                            )}
                        </View>
                    </View>

                    {item.status === 'pending' && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                                onPress={() => handleRequest(item.id, 'rejected')}
                            >
                                <Text style={styles.btnText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                                onPress={() => handleRequest(item.id, 'accepted')}
                            >
                                <Text style={styles.btnText}>Accept</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Map Preview - ONLY FOR PENDING */}
                    {item.status === 'pending' && (
                        <View style={styles.mapContainer}>
                            <DetourMap
                                mode="trip"
                                theme={theme}
                                height={200}
                                readOnly
                                savedPlaces={[]} // Hide saved places
                                trip={{
                                    ...item.tripId,
                                    routeId: normalizedDriverRoute,
                                    clients: [
                                        ...(item.tripId?.clients?.map((c: any) => ({
                                            ...c,
                                            routeId: normalizeRoute(c.routeId)
                                        })) || []),
                                        {
                                            routeId: normalizedClientRoute,
                                            userId: { photoURL: null, fullName: 'You' }, // Placeholder for self
                                            price: item.proposedPrice
                                        }
                                    ]
                                }}
                            />
                        </View>
                    )}
                </BlurView>
            </Animated.View>
        );
    };

    const { mutateAsync: handleJoinRequest } = useHandleJoinRequest();

    const handleRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
        try {
            await handleJoinRequest({ requestId, status });
        } catch (error) {
            console.error(error);
        }
    };

    // Filter updated reclamations (e.g. not pending, or specifically "new message" if we had that flag, 
    // but for now we'll show any active or recently updated ones or rely on the unread count from store if available.
    // Actually, `useReclamations` returns all. Let's show a summary if there are updates.)

    const activeReclamations = reclamations?.filter((r: any) => {
        // Check for admin/support messages
        const lastMsg = r.messages && r.messages.length > 0 ? r.messages[r.messages.length - 1] : null;

        let hasUnreadAdminReply = false;
        if (lastMsg) {
            // In the client view, we are the reporter.
            // Any message NOT sent by us (the reporter) is from Admin/Support.
            // Backend returns senderId as string (ObjectId) or object.
            const reporterId = typeof r.reporterId === 'object' ? r.reporterId._id : r.reporterId;
            const senderId = typeof lastMsg.senderId === 'object' ? lastMsg.senderId._id : lastMsg.senderId;

            // If IDs don't match, it's a reply from someone else (Admin/Support)
            const isAdminReply = String(reporterId) !== String(senderId);

            // Check if it's unread
            // backend 'messages' schema has 'read' boolean. 
            // If isAdminReply is true, we want to know if WE (the reporter) have read it.
            // When admin sends to user, 'read' starts as false. User reads it (on detail page) -> true.
            hasUnreadAdminReply = isAdminReply && !lastMsg.read;
        }

        // Only show notification if there is an unread message from support.
        // This ensures that once the user views the message (marking it as read),
        // the notification disappears from this screen.
        return hasUnreadAdminReply;
    }) || [];

    const NotificationHeader = () => {
        if (activeReclamations.length === 0) return null;

        const isSingle = activeReclamations.length === 1;
        const singleRec = activeReclamations[0];
        const lastMsg = (isSingle && singleRec.messages && singleRec.messages.length > 0)
            ? singleRec.messages[singleRec.messages.length - 1]
            : null;

        const title = isSingle
            ? 'New Message from Support'
            : `${activeReclamations.length} Support Update${activeReclamations.length > 1 ? 's' : ''}`;

        // Use 'text' key as per Mongoose schema
        const subtitle = isSingle
            ? (lastMsg?.text || `New message regarding ticket #${singleRec.id.substring(singleRec.id.length - 6).toUpperCase()}`)
            : 'You have new unread messages from support.';

        return (
            <TouchableOpacity
                style={[styles.notificationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => isSingle ? router.push(`/reclamations/${singleRec.id}`) : router.push('/reclamations')}
            >
                <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
                    <Bell size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.notifTitle, { color: theme.text }]}>
                        {title}
                    </Text>
                    <Text style={[styles.notifSubtitle, { color: theme.icon }]} numberOfLines={1}>
                        {subtitle}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.background }]}>
                {/* Placeholder for Back button if needed, or just space */}
                <View style={{ width: 40 }} />

                <Text style={[styles.title, { color: theme.text }]}>Ride Offers</Text>

                <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.headerBellContainer}>
                    <Bell size={24} color={theme.text} />
                    {activeReclamations.length > 0 && (
                        <View style={[styles.headerBadge, { backgroundColor: theme.primary, borderColor: theme.surface }]}>
                            <Text style={styles.headerBadgeText}>
                                {activeReclamations.length > 9 ? '9+' : activeReclamations.length}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Notification Section - Rendered outside list for guaranteed visibility */}
            <View style={{ paddingHorizontal: 24 }}>
                <NotificationHeader />
            </View>

            {isLoading && (!clientRequests || (clientRequests as any[]).length === 0) ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={clientRequests || []}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => renderRequestItem({ item, index })}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Send size={48} color={theme.icon} />
                            <Text style={[styles.emptyText, { color: theme.text }]}>No offers received yet.</Text>
                            <Text style={{ color: theme.icon, textAlign: 'center', maxWidth: 250 }}>
                                Create a route request and wait for drivers to send you an offer.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    title: { fontSize: 20, fontWeight: '800' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 24, gap: 16 },
    reqCardWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    reqCard: {
        padding: 16,
        gap: 12
    },
    driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    driverName: { fontSize: 16, fontWeight: '700' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '600' },
    actionButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    mapContainer: {
        marginTop: 16,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)'
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16, // Add margin bottom to separate from list items
        borderWidth: 1,
        gap: 14,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    notifSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    headerBellContainer: {
        position: 'relative',
        padding: 4,
    },
    headerBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        zIndex: 10,
    },
    headerBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
        textAlign: 'center',
        paddingHorizontal: 2,
    },
});
