import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    AlertCircle,
    ArrowLeft,
    Bell,
    Car,
    CheckCircle,
    ChevronRight,
    Clock,
    MessageCircle,
    Send,
    Star,
    User
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useReclamations } from '../hooks/api/useReclamationQueries';
import { useClientRequests, useDriverRequests, useHandleJoinRequest, useTrips } from '../hooks/api/useTripQueries';
import { useDispatchFlow } from '../hooks/useDispatchFlow';
import { dispatchActions } from '../store/dispatchActions';
import { useDispatchStore } from '../store/useDispatchStore';
import { useAuthStore } from '../store/useAuthStore';

interface NotificationItem {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    time: string;
    color: string;
    onPress?: () => void;
}

export default function NotificationsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ tab?: string }>();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    // V2 Dispatch and Legacy Requests
    const v2Flow = useDispatchFlow();
    const v2Offers = useDispatchStore((state) => state.offers);
    const { data: clientRequests, isLoading: isRequestsLoading } = useClientRequests();
    const { data: driverRequests } = useDriverRequests();
    const { data: trips } = useTrips();
    const { data: reclamations, refetch: refetchReclamations } = useReclamations();
    const { mutateAsync: handleJoinRequest } = useHandleJoinRequest();

    const [acceptingId, setAcceptingId] = useState<string | null>(null);

    // Unified Ride Offers list
    const unifiedOffers = useMemo(() => {
        const items: any[] = [];

        // 1. V2 Canonical Offers
        if (v2Offers && v2Offers.length > 0) {
            for (const off of v2Offers) {
                const offerId = off._id || off.id;
                const driver = typeof off.driverId === 'object' && off.driverId !== null
                    ? off.driverId
                    : (typeof off.driver === 'object' && off.driver !== null ? off.driver : {});
                
                const driverName = driver.fullName || (driver.firstName ? `${driver.firstName} ${driver.lastName || ''}`.trim() : (off.driverName || `Driver ${String(offerId).slice(-4)}`));
                const rating = driver.rating || off.rating || '4.9';
                
                let vehicle = 'Verified Vehicle';
                if (driver.vehicle) {
                    if (typeof driver.vehicle === 'object') {
                        vehicle = `${driver.vehicle.color || ''} ${driver.vehicle.marque || ''} ${driver.vehicle.model || ''}`.trim() || 'Verified Vehicle';
                    } else {
                        vehicle = String(driver.vehicle);
                    }
                } else if (off.vehicle) {
                    if (typeof off.vehicle === 'object') {
                        vehicle = `${off.vehicle.color || ''} ${off.vehicle.marque || ''} ${off.vehicle.model || ''}`.trim() || 'Verified Vehicle';
                    } else {
                        vehicle = String(off.vehicle);
                    }
                }

                const photoURL = driver.photoURL || off.photoURL;
                const isCounter = off.status === 'COUNTER_OFFERED' || off.isCountered || Boolean(off.counterPrice && off.counterPrice !== off.originalPrice);
                const price = off.counterPrice || off.price || 0;
                const originalPrice = off.originalPrice || off.metadata?.price;
                const pickup = off.routeInfo?.pickup?.address || off.metadata?.pickup?.address || 'Pickup';
                const destination = off.routeInfo?.destination?.address || off.metadata?.destination?.address || 'Destination';

                items.push({
                    id: offerId,
                    type: 'v2',
                    raw: off,
                    driverName,
                    photoURL,
                    rating,
                    vehicle,
                    price,
                    originalPrice,
                    isCounter,
                    pickup,
                    destination,
                    status: off.status || 'OFFERED'
                });
            }
        }

        // 2. Legacy Requests
        if (clientRequests && clientRequests.length > 0) {
            for (const req of clientRequests) {
                const driver = req.tripId?.driverId;
                items.push({
                    id: req.id || req._id,
                    type: 'legacy',
                    raw: req,
                    driverName: driver?.fullName || 'Driver',
                    photoURL: driver?.photoURL,
                    rating: driver?.rating || '4.9',
                    vehicle: driver?.vehicle?.model || 'Verified Vehicle',
                    price: req.proposedPrice || req.price,
                    originalPrice: null,
                    isCounter: false,
                    pickup: req.clientRouteId?.startPoint?.address || 'Pickup',
                    destination: req.clientRouteId?.endPoint?.address || 'Destination',
                    status: req.status || 'pending',
                    legacyReq: req
                });
            }
        }

        return items;
    }, [v2Offers, clientRequests]);

    // Active Tab state: 'offers' (Ride Offers) or 'activity' (Alerts & Activity)
    const initialTab = params.tab === 'activity' ? 'activity' : (unifiedOffers.length > 0 ? 'offers' : 'activity');
    const [activeTab, setActiveTab] = useState<'offers' | 'activity'>(initialTab);

    // Activity Feed Notifications
    const activityNotifications = useMemo(() => {
        const items: NotificationItem[] = [];

        // Client request status updates
        const answeredClientReqs = clientRequests?.filter((r: any) => r.status !== 'pending') || [];
        answeredClientReqs.slice(0, 8).forEach((req: any) => {
            const accepted = req.status === 'accepted';
            items.push({
                id: `cr-${req.id}`,
                icon: accepted ? <CheckCircle size={20} color="#fff" /> : <AlertCircle size={20} color="#fff" />,
                title: accepted ? 'Request Accepted' : 'Request Declined',
                subtitle: accepted ? 'Your trip request was approved!' : 'Your trip request was declined',
                time: new Date(req.createdAt).toLocaleDateString(),
                color: accepted ? '#10B981' : '#EF4444',
            });
        });

        // Driver join requests (for drivers)
        const pendingDriverReqs = driverRequests?.filter((r: any) => r.status === 'pending') || [];
        pendingDriverReqs.forEach((req: any) => {
            items.push({
                id: `dr-${req.id}`,
                icon: <User size={20} color="#fff" />,
                title: 'New Passenger Request',
                subtitle: 'A passenger wants to join your corridor route',
                time: new Date(req.createdAt).toLocaleDateString(),
                color: '#F59E0B',
                onPress: () => router.push('/(driver)' as any),
            });
        });

        // Recent trips
        const recentTrips = trips?.slice(0, 4) || [];
        recentTrips.forEach((trip: any) => {
            items.push({
                id: `trip-${trip.id}`,
                icon: <Send size={20} color="#fff" />,
                title: trip.status === 'active' ? 'Trip Active' : `Trip ${trip.status}`,
                subtitle: trip.routeId?.startPoint?.address
                    ? `${trip.routeId.startPoint.address.substring(0, 35)}...`
                    : 'View trip details',
                time: new Date(trip.createdAt).toLocaleDateString(),
                color: trip.status === 'active' ? '#3B82F6' : '#8B5CF6',
            });
        });

        // Reclamation updates
        (reclamations || []).forEach((rec: any) => {
            const messages = rec.messages || [];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const isAdminMessage = lastMessage?.sender === 'admin' || lastMessage?.sender === 'support';

            let title = `Support: ${rec.subject || 'Ticket'}`;
            let subtitle = lastMessage?.content || rec.description || 'View ticket status';
            let icon = <MessageCircle size={20} color="#fff" />;
            let color = '#3B82F6';

            if (rec.status === 'resolved') {
                title = 'Ticket Resolved';
                color = '#10B981';
                icon = <CheckCircle size={20} color="#fff" />;
            } else if (isAdminMessage) {
                title = 'New Message from Support';
                color = '#F59E0B';
            }

            items.push({
                id: `rec-${rec.id}`,
                icon,
                title,
                subtitle: subtitle.length > 50 ? subtitle.substring(0, 50) + '...' : subtitle,
                time: new Date(rec.updatedAt || rec.createdAt).toLocaleDateString(),
                color,
                onPress: () => router.push({
                    pathname: '/reclamations/[id]',
                    params: { id: rec.id }
                })
            });
        });

        items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        return items;
    }, [clientRequests, driverRequests, trips, reclamations, router]);

    const handleAcceptV2 = async (offerId: string) => {
        try {
            setAcceptingId(offerId);
            await v2Flow.acceptOffer(offerId);
            router.push('/(client)');
        } catch (err) {
            console.error('[NotificationsScreen] handleAcceptV2 error:', err);
        } finally {
            setAcceptingId(null);
        }
    };

    const handleRejectV2 = async (offerId: string) => {
        try {
            await v2Flow.rejectOffer(offerId, 'Client declined the offer');
        } catch (err) {
            console.warn('Reject offer error:', err);
        }
    };

    const handleLegacyAction = async (requestId: string, status: 'accepted' | 'rejected') => {
        try {
            await handleJoinRequest({ requestId, status });
        } catch (error) {
            console.error(error);
        }
    };

    const renderOfferCard = ({ item, index }: { item: any; index: number }) => {
        const isAccepting = acceptingId === item.id;
        const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 70).springify()}
                style={styles.reqCardWrapper}
            >
                <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={[styles.reqCard, { backgroundColor: cardBg, borderColor: theme.border }]}>
                    {/* Counter Offer Proposition Banner */}
                    {item.isCounter && (
                        <View style={styles.counterBanner}>
                            <Text style={styles.counterBannerText}>Driver proposed a new price</Text>
                            {item.originalPrice && (
                                <Text style={styles.counterBannerSub}>Original: {item.originalPrice} MAD</Text>
                            )}
                        </View>
                    )}

                    {/* Driver Profile Row */}
                    <View style={styles.driverInfo}>
                        {item.photoURL ? (
                            <Image source={{ uri: item.photoURL }} style={styles.avatar} contentFit="cover" transition={300} />
                        ) : (
                            <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
                                <Text style={styles.avatarFallbackText}>{item.driverName.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <View style={{ flex: 1, gap: 2 }}>
                            <View style={styles.nameBadgeRow}>
                                <Text style={[styles.driverName, { color: theme.text }]}>{item.driverName}</Text>
                                <View style={styles.ratingBadge}>
                                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                                    <Text style={styles.ratingText}>{item.rating}</Text>
                                </View>
                            </View>
                            <View style={styles.vehicleRow}>
                                <Car size={13} color={theme.icon} />
                                <Text style={[styles.vehicleText, { color: theme.icon }]} numberOfLines={1}>
                                    {item.vehicle}
                                </Text>
                            </View>
                        </View>

                        {/* Price Display */}
                        <View style={styles.priceCol}>
                            {item.isCounter && item.originalPrice ? (
                                <Text style={[styles.originalPriceText, { color: theme.icon }]}>
                                    {item.originalPrice} MAD
                                </Text>
                            ) : null}
                            <Text style={[styles.priceAmount, { color: item.isCounter ? '#f59e0b' : theme.primary }]}>
                                {item.price} MAD
                            </Text>
                        </View>
                    </View>

                    {/* Route Corridor Summary */}
                    <View style={[styles.routeCorridor, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc' }]}>
                        <View style={styles.corridorPoints}>
                            <View style={styles.corridorRow}>
                                <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                                <Text style={[styles.corridorText, { color: theme.text }]} numberOfLines={1}>
                                    {item.pickup}
                                </Text>
                            </View>
                            <View style={styles.corridorRow}>
                                <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                                <Text style={[styles.corridorText, { color: theme.text }]} numberOfLines={1}>
                                    {item.destination}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Actions */}
                    {item.type === 'v2' ? (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: isDark ? '#3a3a3c' : '#f3f4f6' }]}
                                onPress={() => handleRejectV2(item.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.btnTextSecondary, { color: theme.text }]}>Decline</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.actionBtn, 
                                    { backgroundColor: item.isCounter ? '#f59e0b' : theme.primary },
                                    isAccepting && { opacity: 0.7 }
                                ]}
                                onPress={() => handleAcceptV2(item.id)}
                                disabled={isAccepting}
                                activeOpacity={0.8}
                            >
                                {isAccepting ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <>
                                        <Text style={styles.btnText}>
                                            {item.isCounter ? 'Accept Price' : 'Accept Offer'}
                                        </Text>
                                        <ChevronRight size={16} color="#ffffff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        item.status === 'pending' && (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                                    onPress={() => handleLegacyAction(item.id, 'rejected')}
                                >
                                    <Text style={styles.btnText}>Reject</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                                    onPress={() => handleLegacyAction(item.id, 'accepted')}
                                >
                                    <Text style={styles.btnText}>Accept</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    )}
                </BlurView>
            </Animated.View>
        );
    };

    const renderActivityItem = ({ item, index }: { item: NotificationItem; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={item.onPress}
                activeOpacity={item.onPress ? 0.7 : 1}
            >
                <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                    {item.icon}
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.icon }]} numberOfLines={2}>{item.subtitle}</Text>
                </View>
                <Text style={[styles.cardTime, { color: theme.icon }]}>{item.time}</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Unified Clean Header with Back Button */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: theme.background }]}>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}
                    onPress={() => router.back()}
                    accessibilityLabel="Back"
                >
                    <ArrowLeft size={20} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.screenTitle, { color: theme.text }]}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Segmented Control: Offers vs Activity */}
            <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1f1f22' : '#f1f5f9' }]}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'offers' && { backgroundColor: isDark ? '#2c2c2e' : '#fff' }]}
                    onPress={() => setActiveTab('offers')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'offers' ? theme.primary : theme.icon, fontWeight: activeTab === 'offers' ? '700' : '500' }]}>
                        Ride Offers ({unifiedOffers.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'activity' && { backgroundColor: isDark ? '#2c2c2e' : '#fff' }]}
                    onPress={() => setActiveTab('activity')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'activity' ? theme.primary : theme.icon, fontWeight: activeTab === 'activity' ? '700' : '500' }]}>
                        Activity ({activityNotifications.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content List */}
            {activeTab === 'offers' ? (
                isRequestsLoading && unifiedOffers.length === 0 ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={unifiedOffers}
                        keyExtractor={(item) => item.id}
                        renderItem={renderOfferCard}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Send size={44} color={theme.icon} />
                                <Text style={[styles.emptyTitle, { color: theme.text }]}>No offers right now</Text>
                                <Text style={[styles.emptyText, { color: theme.icon }]}>
                                    Driver propositions and route matches will appear here automatically.
                                </Text>
                            </View>
                        }
                    />
                )
            ) : (
                <FlatList
                    data={activityNotifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderActivityItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Clock size={44} color={theme.icon} />
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
                            <Text style={[styles.emptyText, { color: theme.icon }]}>No activity alerts or messages.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    tabsRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 4,
        borderRadius: 12,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 9,
    },
    tabText: {
        fontSize: 14,
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 12,
    },
    reqCardWrapper: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    reqCard: {
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        gap: 12,
    },
    counterBanner: {
        backgroundColor: '#f59e0b18',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#f59e0b40',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    counterBannerText: {
        color: '#f59e0b',
        fontWeight: '700',
        fontSize: 13,
    },
    counterBannerSub: {
        color: '#f59e0b',
        fontSize: 12,
        textDecorationLine: 'line-through',
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    avatarFallback: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarFallbackText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 18,
    },
    nameBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    driverName: {
        fontSize: 16,
        fontWeight: '700',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F59E0B18',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F59E0B',
    },
    vehicleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    vehicleText: {
        fontSize: 12,
    },
    priceCol: {
        alignItems: 'flex-end',
    },
    originalPriceText: {
        fontSize: 12,
        textDecorationLine: 'line-through',
    },
    priceAmount: {
        fontSize: 20,
        fontWeight: '800',
    },
    routeCorridor: {
        padding: 10,
        borderRadius: 12,
    },
    corridorPoints: {
        gap: 6,
    },
    corridorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    corridorText: {
        fontSize: 13,
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    btnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    btnTextSecondary: {
        fontWeight: '600',
        fontSize: 14,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
        gap: 3,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    cardTime: {
        fontSize: 11,
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 280,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
