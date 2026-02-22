import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowUpRight, Bell, Calendar, Car, Clock, DollarSign, Plus, Star, Timer, TrendingUp, User, Wallet } from 'lucide-react-native';
import { Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../../components/GlassCard';
import CardStatItem from '../../components/ui/CardStatItem';
import { Colors } from '../../constants/theme';
import { useDriverRequests, useTrips } from '../../hooks/api/useTripQueries';
import { useCountdownDate } from '../../hooks/useCountdown';
import { useAuthStore } from '../../store/useAuthStore';
import { useRatingStore } from '../../store/useRatingStore';
import { getNextTripOccurrence, IN_PROGRESS_STATUSES } from '../../utils/timeUtils';

const { width } = Dimensions.get('window');

const ScheduleTripCard = ({ trip, index, theme, router }: { trip: any, index: number, theme: any, router: any }) => {
    let targetDate: Date | null = null;
    const isInProgress = IN_PROGRESS_STATUSES.includes(trip.status) || trip.status === 'active';

    if (!isInProgress && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && trip.routeId) {
        targetDate = getNextTripOccurrence(trip.routeId.timeStart, trip.routeId.days || []);
    }
    const countdownStr = useCountdownDate(targetDate);

    return (
        <Animated.View
            entering={FadeInUp.delay(400 + (index * 100))}
        >
            <TouchableOpacity onPress={() => router.push('/(driver)/routes')} activeOpacity={0.9}>
                <GlassCard style={styles.tripCard} intensity={30}>
                    <View style={styles.tripHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[styles.timeBadge, { backgroundColor: theme.surface }]}>
                                <Clock size={14} color={theme.text} />
                                <Text style={[styles.timeBadgeText, { color: theme.text }]}>
                                    {trip.routeId?.timeStart}
                                </Text>
                            </View>
                            {isInProgress ? (
                                <View style={[styles.timeBadge, { backgroundColor: '#ef4444' + '15' }]}>
                                    <View style={[styles.statusDot, { backgroundColor: '#ef4444', marginRight: 4 }]} />
                                    <Text style={[styles.timeBadgeText, { color: '#ef4444' }]}>IN TRIP</Text>
                                </View>
                            ) : countdownStr ? (
                                <View style={[styles.timeBadge, { backgroundColor: theme.primary + '15' }]}>
                                    <Timer size={14} color={theme.primary} />
                                    <Text style={[styles.timeBadgeText, { color: theme.primary }]}>{countdownStr}</Text>
                                </View>
                            ) : null}
                        </View>
                        <View style={[styles.priceBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Text style={[styles.priceBadgeText, { color: '#10B981' }]}>
                                {trip.routeId?.price} MAD/seat
                            </Text>
                        </View>
                    </View>

                    <View style={styles.tripBody}>
                        <View style={styles.timelineContainer}>
                            <View style={[styles.timelineDot, { borderColor: theme.text }]} />
                            <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                            <View style={[styles.timelineDot, { borderColor: theme.primary, backgroundColor: theme.primary }]} />
                        </View>

                        <View style={styles.tripDetails}>
                            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                                {trip.routeId?.startPoint?.address || 'Start Location'}
                            </Text>
                            <View style={{ height: 20 }} />
                            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                                {trip.routeId?.endPoint?.address || 'End Location'}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.tripFooter, { borderTopColor: theme.border }]}>
                        <View style={styles.paxInfo}>
                            <User size={16} color={theme.icon} />
                            <Text style={[styles.paxText, { color: theme.icon }]}>
                                {trip.clients?.length || 0} / {(trip.routeId as any)?.maxPassengers || 4} Passengers
                            </Text>
                        </View>
                        {trip.status === 'active' && (
                            <View style={styles.liveIndicator}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        )}
                    </View>
                </GlassCard>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Reusable Components for Consistency
const SectionHeader = ({ title, action, onAction, theme }: any) => (
    <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {action && (
            <TouchableOpacity onPress={onAction}>
                <Text style={[styles.sectionAction, { color: theme.primary }]}>{action}</Text>
            </TouchableOpacity>
        )}
    </View>
);

export default function DriverDashboard() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const { data: requests } = useDriverRequests();
    const { data: allTrips } = useTrips();

    const pendingRequestsCount = requests?.filter((r: any) => r.status === 'pending').length || 0;

    // Determine average rating
    const getAverageRating = useRatingStore((state) => state.getAverageRating);
    const avgRating = getAverageRating(user?.id || '');

    // Filter trips for current driver
    const trips = allTrips?.filter((t: any) => t.driverId?._id === user?.id || (t.driverId as any) === 'me' || t.driverId?.id === user?.id || t.driverId === user?.id) || [];

    const activeRoutes = trips.length;
    const weeklyPotential = trips.reduce((acc: number, t: any) => acc + ((t.routeId?.price || 0) * (t.routeId?.days?.length || 0)), 0);

    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const todayName = daysMap[today.getDay()];

    const todaysTrips = trips.filter((t: any) => t.routeId?.days?.includes(todayName.substring(0, 3))); // Matching short day name
    todaysTrips.sort((a: any, b: any) => (a.routeId?.timeStart || '').localeCompare(b.routeId?.timeStart || ''));

    // Find next trip
    let nextTripDate: Date | null = null;
    let nextTripRef: any = null;
    let isAnyTripInProgress = false;

    trips.forEach((t: any) => {
        if (IN_PROGRESS_STATUSES.includes(t.status) || t.status === 'active') {
            isAnyTripInProgress = true;
        }

        if (t.status === 'completed' || t.status === 'cancelled' || t.status === 'COMPLETED' || t.status === 'CANCELLED') return;
        if (IN_PROGRESS_STATUSES.includes(t.status) || t.status === 'active') return;

        const occurrence = getNextTripOccurrence(t.routeId?.timeStart, t.routeId?.days);
        if (occurrence) {
            if (!nextTripDate || occurrence.getTime() < nextTripDate.getTime()) {
                nextTripDate = occurrence;
                nextTripRef = t;
            }
        }
    });

    const nextTripCountdown = useCountdownDate(nextTripDate);

    // Custom gradient for weekly potential card
    const cardGradient = colorScheme === 'dark'
        ? ['#4F46E5', '#7C3AED']
        : ['#4338CA', '#6D28D9'];

    return (
        <View style={styles.container}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

            <LinearGradient
                colors={[theme.background, theme.surface]}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                showsVerticalScrollIndicator={false}
            >


                {/* Notifications Banner */}
                {pendingRequestsCount > 0 && (
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.notificationWrapper}>
                        <TouchableOpacity
                            style={[styles.notificationCard, { backgroundColor: theme.primary }]}
                            onPress={() => router.push('/(driver)/requests')}
                            activeOpacity={0.9}
                        >
                            <View style={styles.notificationContent}>
                                <View style={[styles.notificationIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                    <Bell size={18} color="#fff" />
                                </View>
                                <View>
                                    <Text style={styles.notificationTitle}>New Requests</Text>
                                    <Text style={styles.notificationText}>
                                        You have <Text style={{ fontWeight: '800' }}>{pendingRequestsCount}</Text> pending request{pendingRequestsCount > 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.arrowContainer}>
                                <ArrowUpRight size={20} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Main Stats Card - Weekly Potential */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.kpiContainer}>
                    <TouchableOpacity onPress={() => router.push('/finance/wallet')} activeOpacity={0.95}>
                        <View style={[styles.heroCard, { shadowColor: cardGradient[0] }]}>
                            <LinearGradient
                                colors={cardGradient as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.heroGradient}
                            >
                                {/* Background Decorations */}
                                <View style={[styles.bgCircle, { top: -20, right: -20, width: 100, height: 100 }]} />
                                <View style={[styles.bgCircle, { bottom: -40, left: -20, width: 140, height: 140, opacity: 0.05 }]} />

                                <View style={styles.heroValidContent}>
                                    <View style={styles.heroTopRow}>
                                        <View style={[styles.heroIconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                            <TrendingUp size={20} color="#fff" />
                                        </View>
                                        {isAnyTripInProgress ? (
                                            <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                                <View style={[styles.statusDot, { backgroundColor: '#fff', marginRight: 0 }]} />
                                                <Text style={styles.trendText}>Trip in progress</Text>
                                            </View>
                                        ) : nextTripCountdown ? (
                                            <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                                <Timer size={14} color="#fff" />
                                                <Text style={styles.trendText}>Next trip {nextTripCountdown}</Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                                <Text style={styles.trendText}>+12% vs last week</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View>
                                        <Text style={styles.heroLabel}>WEEKLY POTENTIAL</Text>
                                        <Text style={styles.heroValue}>{weeklyPotential.toLocaleString()} MAD</Text>
                                    </View>
                                </View>

                                <View style={styles.heroGraph}>
                                    {[0.4, 0.6, 0.3, 0.8, 0.5, 0.9, 0.7].map((h, i) => (
                                        <View key={i} style={styles.graphBarContainer}>
                                            <View style={[styles.graphBar, { height: `${h * 100}%`, opacity: i === 6 ? 1 : 0.5 }]} />
                                        </View>
                                    ))}
                                </View>
                            </LinearGradient>
                        </View>
                    </TouchableOpacity>

                    {/* Secondary Metrics Grid */}
                    <View style={styles.metricsGrid}>
                        {/* Row 1 */}
                        <View style={styles.metricsRow}>
                            <CardStatItem
                                label="Active Routes"
                                value={activeRoutes}
                                icon={Car}
                                theme={theme}
                                color={theme.text}
                            />

                            <CardStatItem
                                label="Wallet Balance"
                                value={`${user?.balance?.toFixed(0) || '0'}`}
                                icon={Wallet}
                                theme={theme}
                                color={theme.primary}
                                onPress={() => router.push('/finance/wallet')}
                            />
                        </View>

                        {/* Row 2 */}
                        <View style={styles.metricsRow}>
                            <CardStatItem
                                label="Driver Rating"
                                value={(user?.stats?.rating || avgRating).toFixed(1)}
                                icon={Star}
                                theme={theme}
                                color="#EAB308"
                            />

                            <CardStatItem
                                label="Total Earnings"
                                value={`${user?.earnings?.total?.toLocaleString() || '0'}`}
                                icon={DollarSign}
                                theme={theme}
                                color="#10B981"
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* Today's Schedule */}
                <View style={styles.section}>
                    <SectionHeader
                        title={`Today's Schedule (${todaysTrips.length})`}
                        theme={theme}
                        action={todaysTrips.length > 0 ? "View All" : null}
                        onAction={() => router.push('/(driver)/routes')}
                    />

                    {todaysTrips.length > 0 ? (
                        todaysTrips.map((trip: any, index: number) => (
                            <ScheduleTripCard key={trip.id} trip={trip} index={index} theme={theme} router={router} />
                        ))
                    ) : (
                        <Animated.View entering={FadeInUp.delay(400)}>
                            <GlassCard style={styles.emptyStateCard} intensity={10}>
                                <View style={[styles.emptyIcon, { backgroundColor: theme.surface }]}>
                                    <Calendar size={32} color={theme.icon} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: theme.text }]}>No routes today</Text>
                                <Text style={[styles.emptySub, { color: theme.icon }]}>
                                    Your schedule is clear. Use the + button to add a route and start earning.
                                </Text>
                            </GlassCard>
                        </Animated.View>
                    )}
                </View>

                {/* Bottom Spacer for FAB */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Action Button */}
            <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                    style={[styles.fab, { shadowColor: theme.primary }]}
                    onPress={() => router.push('/(driver)/add-route')}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={[theme.primary, theme.secondary || theme.primary]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <Plus size={24} color="#fff" />
                    <Text style={styles.fabText}>New Route</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    // Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    // Notifications
    notificationWrapper: {
        marginBottom: 24,
    },
    notificationCard: {
        borderRadius: 20,
        padding: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    notificationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationTitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    notificationText: {
        color: '#fff',
        fontSize: 14,
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // KPI Section
    kpiContainer: {
        marginBottom: 32,
        gap: 16,
    },
    heroCard: {
        borderRadius: 32,
        height: 180,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    heroGradient: {
        flex: 1,
        borderRadius: 32,
        padding: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    bgCircle: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 999,
        opacity: 0.1,
    },
    heroValidContent: {
        flex: 1,
        justifyContent: 'space-between',
        zIndex: 1,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    heroIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trendBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    trendText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    heroValue: {
        color: '#fff',
        fontSize: 40,
        fontWeight: '800',
        letterSpacing: -1,
    },
    heroGraph: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        left: 0,
        height: 60,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        paddingRight: 24,
        paddingBottom: 24,
        gap: 6,
        zIndex: 0,
    },
    graphBarContainer: {
        height: '100%',
        width: 8,
        justifyContent: 'flex-end',
    },
    graphBar: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 4,
    },
    // Metrics Grid
    metricsGrid: {
        gap: 12,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    metricCard: {
        flex: 1,
        borderRadius: 24,
        gap: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    metricValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metricIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 2,
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Routes Section
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    sectionAction: {
        fontSize: 14,
        fontWeight: '700',
    },
    tripCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    timeBadgeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    priceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    priceBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    tripBody: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    timelineContainer: {
        alignItems: 'center',
        marginRight: 16,
        width: 16,
        paddingVertical: 4,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
        borderRadius: 1,
    },
    tripDetails: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 0,
    },
    locationText: {
        fontSize: 15,
        fontWeight: '600',
    },
    tripFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderStyle: 'dashed',
    },
    paxInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    paxText: {
        fontSize: 13,
        fontWeight: '500',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#ef4444',
    },
    liveText: {
        color: '#ef4444',
        fontSize: 10,
        fontWeight: '800',
    },
    // Empty State
    emptyStateCard: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        borderStyle: 'dashed',
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        textAlign: 'center',
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.6,
    },
    // FAB
    fabContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 32,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        overflow: 'hidden',
    },
    fabText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

