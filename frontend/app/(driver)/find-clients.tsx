import { useUIStore } from '@/store/useUIStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, List, Map as MapIcon, MapPin, User, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DetourMap from '../../components/Map';
import { Colors } from '../../constants/theme';
import { useMatches, useSendJoinRequest, useTrips } from '../../hooks/api/useTripQueries';

export default function DriverFindClientsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const router = useRouter();
    const params = useLocalSearchParams();

    // We need the tripId or routeId to find matches.
    // If coming from a specific trip, we use that.
    // Otherwise we might need to select a trip.
    // For now, let's assume valid routeId is passed or we pick the first active trip's routeId.

    const { data: trips } = useTrips();
    const [activeRouteId, setActiveRouteId] = useState<string | null>(params.routeId as string || null);
    const [activeTripId, setActiveTripId] = useState<string | null>(params.tripId as string || null);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    useEffect(() => {
        if (!activeRouteId && trips?.length) {
            // Default to first pending/active trip
            const trip = trips.find(t => t.status === 'pending' || t.status === 'active');
            if (trip) {
                setActiveRouteId(trip.routeId.id);
                setActiveTripId(trip.id);
            }
        }
    }, [trips, activeRouteId]);

    const { data: matches, isLoading } = useMatches(activeRouteId);
    const { mutateAsync: sendRequest } = useSendJoinRequest();
    const { showToast } = useUIStore();

    const activeTrip = useMemo(() => trips?.find(t => t.id === activeTripId), [trips, activeTripId]);

    const mapTripData = useMemo(() => {
        if (!activeTrip) return null;

        // Merge accepted clients with potential matches for visualization
        const visualizationClients = [
            ...(activeTrip.clients || []),
            ...(matches?.map((m: any) => ({
                userId: m.route.userId,
                routeId: m.route,
                price: m.route.price,
                isPotential: true // We might want to style these differently in the future
            })) || [])
        ];

        return {
            ...activeTrip,
            clients: visualizationClients
        };
    }, [activeTrip, matches]);

    const handleSendRequest = async (clientRouteId: string, proposedPrice: number) => {
        if (!activeTripId) return;
        try {
            await sendRequest({
                clientRouteId,
                tripId: activeTripId,
                // @ts-ignore
                proposedPrice // Passing proposed price (currently same as client's proposal, or could be editable)
            });
            showToast('Invitation sent!', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.msg || 'Failed to send invite', 'error');
        }
    };

    const renderClientItem = ({ item, index }: { item: any, index: number }) => {
        const client = item.route.userId;
        const isRequested = item.requestStatus === 'pending' || item.requestStatus === 'accepted';

        // Prepare data for mini-map
        const miniTripData = activeTrip ? {
            ...activeTrip,
            clients: [{
                userId: client,
                routeId: item.route,
                price: item.route.price,
                isPotential: true
            }]
        } : null;

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        {client?.photoURL ? (
                            <Image source={{ uri: client.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: theme.background }]}>
                                <User size={24} color={theme.icon} />
                            </View>
                        )}
                        <View>
                            <Text style={[styles.userName, { color: theme.text }]}>{client?.fullName || 'Client'}</Text>
                            <View style={styles.badgeContainer}>
                                <View style={[styles.budgetBadge, { backgroundColor: theme.primary + '15' }]}>
                                    <Wallet size={12} color={theme.primary} />
                                    <Text style={[styles.budgetText, { color: theme.primary }]}>{item.route.price} MAD</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.distanceBadge, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.distanceText, { color: theme.textSecondary }]}>{item.route.distanceKm} km</Text>
                    </View>
                </View>

                {/* Mini Map */}
                <View style={styles.mapContainer}>
                    {miniTripData && (
                        <DetourMap
                            mode="trip"
                            theme={theme}
                            trip={miniTripData as any}
                            height={150}
                            interactive={false}
                            style={{ borderRadius: 16 }}
                        />
                    )}
                </View>

                <View style={[styles.routeContainer, { backgroundColor: theme.background }]}>
                    <View style={styles.routeRow}>
                        <MapPin size={16} color={theme.primary} />
                        <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>{item.route.startPoint.address}</Text>
                    </View>
                    <View style={{ paddingLeft: 7 }}>
                        <View style={{ width: 2, height: 12, backgroundColor: theme.border }} />
                    </View>
                    <View style={styles.routeRow}>
                        <MapPin size={16} color={theme.secondary} />
                        <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>{item.route.endPoint.address}</Text>
                    </View>
                </View>

                <View style={styles.actionSection}>
                    {isRequested ? (
                        <View style={[styles.invitedBadge, { backgroundColor: '#10b981' + '15' }]}>
                            <Text style={{ color: '#10b981', fontWeight: '700' }}>Invitation Sent</Text>
                        </View>
                    ) : (
                        <View style={styles.actionRow}>
                            <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.background }]}>
                                <Text style={{ color: theme.textSecondary, fontSize: 12, marginRight: 4 }}>MAD</Text>
                                <TextInput
                                    style={[styles.priceInput, { color: theme.text }]}
                                    placeholder="Price"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="numeric"
                                    defaultValue={item.route.price?.toString()}
                                    onChangeText={(text: string) => {
                                        item.proposedPrice = parseFloat(text);
                                    }}
                                />
                            </View>
                            <TouchableOpacity
                                onPress={() => handleSendRequest(item.route.id, item.proposedPrice || item.route.price)}
                                activeOpacity={0.8}
                                style={{ flex: 1 }}
                            >
                                <LinearGradient
                                    colors={[theme.primary, theme.secondary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.inviteButton}
                                >
                                    <Text style={styles.buttonText}>Invite</Text>
                                    <ArrowRight size={16} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={colorScheme === 'dark' ? [theme.surface, theme.background] : [theme.surface, theme.background]}
                style={[styles.header, { paddingTop: 60, paddingBottom: 20 }]}
            >
                <Text style={[styles.title, { color: theme.text }]}>Find Clients</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 16 }}>Match with nearby requests</Text>

                <View style={[styles.toggleContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: theme.primary }]}
                        onPress={() => setViewMode('list')}
                    >
                        <List size={20} color={viewMode === 'list' ? '#fff' : theme.text} />
                        <Text style={[styles.toggleText, { color: viewMode === 'list' ? '#fff' : theme.text }]}>List</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'map' && { backgroundColor: theme.primary }]}
                        onPress={() => setViewMode('map')}
                    >
                        <MapIcon size={20} color={viewMode === 'map' ? '#fff' : theme.text} />
                        <Text style={[styles.toggleText, { color: viewMode === 'map' ? '#fff' : theme.text }]}>Map</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {viewMode === 'map' ? (
                <View style={{ flex: 1 }}>
                    {mapTripData ? (
                        <DetourMap
                            mode="trip"
                            theme={theme}
                            trip={mapTripData as any}
                            style={{ flex: 1 }}
                        />
                    ) : (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color={theme.primary} />
                        </View>
                    )}
                    {/* Optional: Add a bottom sheet or carousel here for map interaction */}
                </View>
            ) : (
                isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={matches || []}
                        keyExtractor={(item) => item.route.id}
                        renderItem={renderClientItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.center}>
                                <View style={[styles.emptyIconBg, { backgroundColor: theme.surface }]}>
                                    <User size={40} color={theme.icon} />
                                </View>
                                <Text style={[styles.emptyText, { color: theme.text }]}>No clients found nearby</Text>
                                <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8 }}>
                                    Try adjusting your route or check back later.
                                </Text>
                            </View>
                        }
                    />
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    list: { padding: 24, gap: 20, paddingBottom: 100 },
    card: {
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        // shadowColor: "#000",
        // shadowOffset: { width: 0, height: 4 },
        // shadowOpacity: 0.05,
        // shadowRadius: 12,
        // elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    userInfo: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
    avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    userName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    badgeContainer: { flexDirection: 'row', gap: 8 },
    budgetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    budgetText: { fontSize: 12, fontWeight: '700' },
    distanceBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    distanceText: { fontSize: 12, fontWeight: '700' },

    mapContainer: {
        height: 150,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },

    routeContainer: {
        borderRadius: 16,
        padding: 12,
        gap: 8,
        marginBottom: 16,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    routeText: { fontSize: 13, fontWeight: '600', flex: 1 },

    actionSection: {
        marginTop: 4,
    },
    invitedBadge: {
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
        width: 100,
    },
    priceInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        height: '100%',
    },
    inviteButton: {
        flexDirection: 'row',
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyText: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },

    toggleContainer: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 16,
        borderWidth: 1,
        width: '100%',
        marginTop: 12,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
    },
    toggleText: {
        fontWeight: '700',
        fontSize: 14,
    },
});
