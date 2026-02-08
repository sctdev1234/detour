import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Briefcase,
    Calendar,
    ChevronRight,
    Clock,
    Home,
    MapPin,
    Navigation,
    Plus,
    Route as RouteIcon,
    Search,
    Star,
    X
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { ClientRequest, useClientRequestStore } from '../../store/useClientRequestStore';
import { useRatingStore } from '../../store/useRatingStore';
import { Route, useTripStore } from '../../store/useTripStore';

export default function ClientDashboard() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { routes, fetchRoutes, isLoading } = useTripStore();
    const { requests } = useClientRequestStore();

    const getAverageRating = useRatingStore((state) => state.getAverageRating);
    const avgRating = getAverageRating(user?.id || '');

    const [greeting, setGreeting] = useState('Hello');
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [showRouteDetails, setShowRouteDetails] = useState(false);

    // Get client's own routes (filter by role=client)
    const myRoutes = routes.filter(r => r.role === 'client').slice(0, 5);

    // Get recent completed trips
    const recentTrips = requests
        .filter(r => r.status === 'completed' || r.status === 'accepted')
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    useEffect(() => {
        fetchRoutes();
    }, []);

    const handleQuickAction = (action: string) => {
        router.push('/(client)/add-route');
    };

    const handleRoutePress = (route: Route) => {
        setSelectedRoute(route);
        setShowRouteDetails(true);
    };

    const handleFindMatches = (routeId: string) => {
        setShowRouteDetails(false);
        router.push({ pathname: '/(client)/find-matches', params: { routeId } });
    };

    const QuickAction = ({ icon: Icon, label, onPress }: { icon: any, label: string, onPress: () => void }) => (
        <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={onPress}
        >
            <View style={[styles.quickActionIcon, { backgroundColor: theme.primary + '20' }]}>
                <Icon size={24} color={theme.primary} />
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>{label}</Text>
        </TouchableOpacity>
    );

    const renderRecentTrip = (request: ClientRequest) => {
        return (
            <TouchableOpacity
                key={request.id}
                style={[styles.tripCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => router.push({
                    pathname: '/(client)/trip-details',
                    params: { requestId: request.id }
                })}
            >
                <View style={styles.tripIcon}>
                    <MapPin size={24} color={theme.primary} />
                </View>
                <View style={styles.tripDetails}>
                    <Text style={[styles.tripTitle, { color: theme.text }]}>Trip to Destination</Text>
                    <Text style={[styles.tripSubtitle, { color: theme.icon }]}>
                        {new Date(request.createdAt).toLocaleDateString()} • {request.status}
                    </Text>
                </View>
                <View style={[styles.reorderButton, { backgroundColor: theme.primary + '10' }]}>
                    <ChevronRight size={16} color={theme.primary} />
                </View>
            </TouchableOpacity>
        );
    };

    const renderRouteCard = (route: Route, index: number) => (
        <Animated.View
            key={route.id}
            entering={FadeInDown.delay(index * 80).springify()}
        >
            <TouchableOpacity
                style={[styles.routeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => handleRoutePress(route)}
                activeOpacity={0.7}
            >
                {/* Route Icon */}
                <View style={[styles.routeIconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <RouteIcon size={22} color={theme.primary} />
                </View>

                {/* Route Info */}
                <View style={styles.routeInfo}>
                    <Text style={[styles.routeAddress, { color: theme.text }]} numberOfLines={1}>
                        {route.startPoint.address || 'Start Location'}
                    </Text>
                    <View style={styles.routeArrow}>
                        <View style={[styles.routeDot, { backgroundColor: theme.primary }]} />
                        <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
                        <View style={[styles.routeSquare, { borderColor: theme.text }]} />
                    </View>
                    <Text style={[styles.routeAddress, { color: theme.text }]} numberOfLines={1}>
                        {route.endPoint.address || 'End Location'}
                    </Text>
                </View>

                {/* Time Badge */}
                <View style={[styles.timeBadge, { backgroundColor: theme.primary + '10' }]}>
                    <Clock size={12} color={theme.primary} />
                    <Text style={[styles.timeText, { color: theme.primary }]}>{route.timeStart}</Text>
                </View>

                {/* Chevron */}
                <ChevronRight size={20} color={theme.icon} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
        </Animated.View>
    );

    const RouteDetailsModal = () => (
        <Modal
            visible={showRouteDetails}
            animationType="slide"
            transparent
            onRequestClose={() => setShowRouteDetails(false)}
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={SlideInUp.springify()}
                    style={[styles.modalContent, { backgroundColor: theme.background }]}
                >
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Route Details</Text>
                        <TouchableOpacity
                            onPress={() => setShowRouteDetails(false)}
                            style={[styles.closeButton, { backgroundColor: theme.surface }]}
                        >
                            <X size={20} color={theme.icon} />
                        </TouchableOpacity>
                    </View>

                    {selectedRoute && (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Route Trajectory */}
                            <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <View style={styles.trajectorySection}>
                                    <View style={styles.trajectoryTimeline}>
                                        <View style={[styles.trajectoryDot, { backgroundColor: theme.primary }]} />
                                        <View style={[styles.trajectoryLine, { backgroundColor: theme.border }]} />
                                        <View style={[styles.trajectorySquare, { borderColor: theme.text }]} />
                                    </View>
                                    <View style={styles.trajectoryAddresses}>
                                        <View style={styles.addressItem}>
                                            <Text style={[styles.addressLabel, { color: theme.icon }]}>From</Text>
                                            <Text style={[styles.addressText, { color: theme.text }]}>
                                                {selectedRoute.startPoint.address || 'Start Location'}
                                            </Text>
                                        </View>
                                        <View style={styles.addressItem}>
                                            <Text style={[styles.addressLabel, { color: theme.icon }]}>To</Text>
                                            <Text style={[styles.addressText, { color: theme.text }]}>
                                                {selectedRoute.endPoint.address || 'End Location'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Schedule */}
                            <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <View style={styles.detailRow}>
                                    <View style={[styles.detailIconBox, { backgroundColor: theme.primary + '15' }]}>
                                        <Clock size={18} color={theme.primary} />
                                    </View>
                                    <View>
                                        <Text style={[styles.detailLabel, { color: theme.icon }]}>Departure Time</Text>
                                        <Text style={[styles.detailValue, { color: theme.text }]}>{selectedRoute.timeStart}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Days */}
                            <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <View style={styles.detailRow}>
                                    <View style={[styles.detailIconBox, { backgroundColor: theme.primary + '15' }]}>
                                        <Calendar size={18} color={theme.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.detailLabel, { color: theme.icon }]}>Schedule Days</Text>
                                        <View style={styles.daysContainer}>
                                            {selectedRoute.days.map((day) => (
                                                <View key={day} style={[styles.dayChip, { backgroundColor: theme.primary + '20' }]}>
                                                    <Text style={[styles.dayChipText, { color: theme.primary }]}>{day}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Distance & Duration */}
                            {(selectedRoute.distanceKm || selectedRoute.estimatedDurationMin) && (
                                <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                    <View style={styles.statsRow}>
                                        {selectedRoute.distanceKm && (
                                            <View style={styles.statItem}>
                                                <Navigation size={18} color={theme.primary} />
                                                <Text style={[styles.statValue, { color: theme.text }]}>
                                                    {selectedRoute.distanceKm.toFixed(1)} km
                                                </Text>
                                            </View>
                                        )}
                                        {selectedRoute.estimatedDurationMin && (
                                            <View style={styles.statItem}>
                                                <Clock size={18} color={theme.primary} />
                                                <Text style={[styles.statValue, { color: theme.text }]}>
                                                    {selectedRoute.estimatedDurationMin} min
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Find Matches Button */}
                            <TouchableOpacity
                                style={[styles.findMatchesBtn, { backgroundColor: theme.primary }]}
                                onPress={() => handleFindMatches(selectedRoute.id)}
                            >
                                <Search size={20} color="#fff" />
                                <Text style={styles.findMatchesBtnText}>Find Matching Drivers</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header with Gradient */}
            <LinearGradient
                colors={[theme.primary, theme.secondary || theme.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View>
                    <Text style={[styles.welcomeText, { color: 'rgba(255,255,255,0.8)' }]}>{greeting},</Text>
                    <Text style={[styles.nameText, { color: '#fff' }]}>{user?.fullName || 'Traveler'}</Text>
                    {avgRating > 0 && (
                        <View style={[styles.ratingBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Star size={12} color="#FFD700" fill="#FFD700" />
                            <Text style={[styles.ratingText, { color: '#fff' }]}>{avgRating.toFixed(1)}</Text>
                        </View>
                    )}
                </View>
            </LinearGradient>

            {/* Search Bar & Quick Actions Container */}
            <View style={{ marginTop: -30, paddingHorizontal: 24 }}>
                {/* Search Bar */}
                <TouchableOpacity
                    onPress={() => router.push('/(client)/add-route')}
                    activeOpacity={0.9}
                >
                    <BlurView intensity={30} tint="default" style={styles.searchBar}>
                        <Search size={22} color={theme.primary} />
                        <Text style={[styles.searchPlaceholder, { color: theme.icon }]}>Where to next?</Text>
                    </BlurView>
                </TouchableOpacity>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                    <QuickAction icon={Home} label="Home" onPress={() => handleQuickAction('Home')} />
                    <QuickAction icon={Briefcase} label="Work" onPress={() => handleQuickAction('Work')} />
                    <QuickAction icon={Clock} label="History" onPress={() => router.push('/(client)/trips')} />
                </View>
            </View>

            {/* My Routes Section */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>My Routes</Text>
                    <TouchableOpacity onPress={() => router.push('/(client)/routes')}>
                        <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                    </TouchableOpacity>
                </View>

                {myRoutes.length > 0 ? (
                    <View style={{ gap: 12, paddingHorizontal: 24 }}>
                        {myRoutes.map((route, index) => renderRouteCard(route, index))}
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.emptyRouteCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => router.push('/(client)/add-route')}
                    >
                        <View style={[styles.emptyRouteIcon, { backgroundColor: theme.primary + '15' }]}>
                            <Plus size={28} color={theme.primary} />
                        </View>
                        <Text style={[styles.emptyRouteTitle, { color: theme.text }]}>Create Your First Route</Text>
                        <Text style={[styles.emptyRouteSubtitle, { color: theme.icon }]}>
                            Add your daily commute to find matching drivers
                        </Text>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* Recent Trips Section */}
            {recentTrips.length > 0 && (
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Trips</Text>
                        <TouchableOpacity onPress={() => router.push('/(client)/requests')}>
                            <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ gap: 12 }}>
                        {recentTrips.map(renderRecentTrip)}
                    </View>
                </Animated.View>
            )}

            <View style={{ height: 120 }} />

            {/* Route Details Modal */}
            <RouteDetailsModal />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 40,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    welcomeText: {
        fontSize: 16,
        marginBottom: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    nameText: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '700',
    },
    searchBarContainer: {},
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 24,
        gap: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    searchPlaceholder: {
        fontSize: 16,
        fontWeight: '600',
    },
    quickActionsContainer: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 24,
        marginBottom: 36,
    },
    quickAction: {
        flex: 1,
        paddingVertical: 18,
        borderRadius: 22,
        borderWidth: 1,
        alignItems: 'center',
        gap: 10,
        boxShadow: '0px 4px 10px rgba(0,0,0,0.03)',
        elevation: 2,
    },
    quickActionIcon: {
        width: 52,
        height: 52,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActionText: {
        fontSize: 14,
        fontWeight: '700',
    },
    section: {
        marginBottom: 36,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    seeAllText: {
        fontSize: 15,
        fontWeight: '700',
    },
    tripCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 24,
        borderWidth: 1,
        marginHorizontal: 24,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.03)',
    },
    tripIcon: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: '#0066FF10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18,
    },
    tripDetails: {
        flex: 1,
    },
    tripTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    tripSubtitle: {
        fontSize: 13,
        opacity: 0.7,
        fontWeight: '500',
    },
    reorderButton: {
        padding: 10,
        borderRadius: 14,
        marginLeft: 8,
    },

    // Route Card Styles
    routeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        boxShadow: '0px 2px 10px rgba(0,0,0,0.04)',
        elevation: 2,
    },
    routeIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    routeInfo: {
        flex: 1,
        gap: 4,
    },
    routeAddress: {
        fontSize: 14,
        fontWeight: '600',
    },
    routeArrow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 2,
    },
    routeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    routeLine: {
        flex: 1,
        height: 2,
        maxWidth: 40,
    },
    routeSquare: {
        width: 6,
        height: 6,
        borderWidth: 1.5,
        borderRadius: 1,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // Empty Route Card
    emptyRouteCard: {
        marginHorizontal: 24,
        padding: 32,
        borderRadius: 24,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        gap: 12,
    },
    emptyRouteIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyRouteTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptyRouteSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Detail Cards
    detailCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    trajectorySection: {
        flexDirection: 'row',
        gap: 16,
    },
    trajectoryTimeline: {
        alignItems: 'center',
        paddingTop: 4,
    },
    trajectoryDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    trajectoryLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
    },
    trajectorySquare: {
        width: 12,
        height: 12,
        borderWidth: 2,
        borderRadius: 2,
    },
    trajectoryAddresses: {
        flex: 1,
        justifyContent: 'space-between',
        minHeight: 80,
    },
    addressItem: {
        gap: 2,
    },
    addressLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    addressText: {
        fontSize: 15,
        fontWeight: '600',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    detailIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    dayChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    dayChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    findMatchesBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 18,
        borderRadius: 20,
        marginTop: 8,
    },
    findMatchesBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
