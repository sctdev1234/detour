import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowUpRight, Bell, Calendar, Car, MapPin, Plus, Star, TrendingUp, User } from 'lucide-react-native';
import { Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientRequestStore } from '../../store/useClientRequestStore';
import { useRatingStore } from '../../store/useRatingStore';
import { useTripStore } from '../../store/useTripStore';

const { width } = Dimensions.get('window');

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

    const pendingRequestsCount = useClientRequestStore((state) =>
        state.requests.filter(r => r.status === 'pending').length
    );
    const getAverageRating = useRatingStore((state) => state.getAverageRating);
    const avgRating = getAverageRating(user?.id || '');

    // Real Data from TripStore
    const trips = useTripStore((state) => state.trips.filter(t => t.driverId?._id === user?.id || (t.driverId as any) === 'me'));

    const activeRoutes = trips.length;
    const totalDistance = trips.reduce((acc, t) => acc + (t.routeId?.distanceKm || 0), 0);
    const weeklyPotential = trips.reduce((acc, t) => acc + ((t.routeId?.price || 0) * (t.routeId?.days?.length || 0)), 0);

    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayIndex = new Date().getDay();
    const todayName = daysMap[todayIndex];
    const dateNum = new Date().getDate();

    const todaysTrips = trips.filter(t => t.routeId?.days?.includes(todayName));
    todaysTrips.sort((a, b) => (a.routeId?.timeStart || '').localeCompare(b.routeId?.timeStart || ''));

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
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
                            {user?.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} contentFit="cover" transition={500} />
                            ) : (
                                <Text style={[styles.avatarText, { color: theme.text }]}>
                                    {user?.fullName?.charAt(0) || 'D'}
                                </Text>
                            )}
                        </View>
                        <View>
                            <Text style={[styles.greeting, { color: theme.icon }]}>Welcome back,</Text>
                            <Text style={[styles.userName, { color: theme.text }]}>{user?.fullName?.split(' ')[0]}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusPill, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                        <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                        <Text style={[styles.statusText, { color: theme.text }]}>Online</Text>
                    </View>
                </View>

                {/* Notifications */}
                {pendingRequestsCount > 0 && (
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.notificationWrapper}>
                        <TouchableOpacity
                            style={[styles.notificationCard, { backgroundColor: theme.primary }]}
                            onPress={() => router.push('/(driver)/requests')}
                            activeOpacity={0.9}
                        >
                            <View style={styles.notificationContent}>
                                <View style={[styles.notificationIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                    <Bell size={16} color="#fff" />
                                </View>
                                <Text style={styles.notificationText}>
                                    <Text style={{ fontWeight: '700' }}>{pendingRequestsCount} new requests</Text> waiting
                                </Text>
                            </View>
                            <ArrowUpRight size={18} color="rgba(255,255,255,0.8)" />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* KPI Section */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.kpiContainer}>
                    <GlassCard style={styles.heroCard} intensity={40}>
                        <LinearGradient
                            colors={[theme.primary, theme.secondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGradient}
                        >
                            <View>
                                <View style={styles.heroHeader}>
                                    <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <TrendingUp size={16} color="#fff" />
                                    </View>
                                    <Text style={styles.heroLabel}>WEEKLY POTENTIAL</Text>
                                </View>
                                <Text style={styles.heroValue}>${weeklyPotential.toLocaleString()}</Text>
                            </View>
                            <View style={styles.heroGraph}>
                                <View style={[styles.graphBar, { height: 12, opacity: 0.3 }]} />
                                <View style={[styles.graphBar, { height: 20, opacity: 0.5 }]} />
                                <View style={[styles.graphBar, { height: 16, opacity: 0.4 }]} />
                                <View style={[styles.graphBar, { height: 28, opacity: 0.8 }]} />
                                <View style={[styles.graphBar, { height: 24, opacity: 0.6 }]} />
                                <View style={[styles.graphBar, { height: 32, opacity: 1.0 }]} />
                            </View>
                        </LinearGradient>
                    </GlassCard>

                    <View style={styles.metricsGrid}>
                        <GlassCard style={styles.metricCard}>
                            <Text style={[styles.metricLabel, { color: theme.icon }]}>ACTIVE ROUTES</Text>
                            <View style={styles.metricContent}>
                                <Car size={18} color={theme.text} />
                                <Text style={[styles.metricValue, { color: theme.text }]}>{activeRoutes}</Text>
                            </View>
                        </GlassCard>
                        <GlassCard style={styles.metricCard}>
                            <Text style={[styles.metricLabel, { color: theme.icon }]}>DISTANCE (KM)</Text>
                            <View style={styles.metricContent}>
                                <MapPin size={18} color={theme.text} />
                                <Text style={[styles.metricValue, { color: theme.text }]}>{totalDistance}</Text>
                            </View>
                        </GlassCard>
                        <GlassCard style={styles.metricCard}>
                            <Text style={[styles.metricLabel, { color: theme.icon }]}>RATING</Text>
                            <View style={styles.metricContent}>
                                <Star size={18} color="#EAB308" fill="#EAB308" />
                                <Text style={[styles.metricValue, { color: theme.text }]}>{avgRating.toFixed(1)}</Text>
                            </View>
                        </GlassCard>
                    </View>
                </Animated.View>

                {/* Today's Routes */}
                <View style={styles.section}>
                    <SectionHeader
                        title={`Today, ${todayName} ${dateNum}`}
                        theme={theme}
                        action={todaysTrips.length > 0 ? "View All" : null}
                        onAction={() => router.push('/(driver)/routes')}
                    />

                    {todaysTrips.length > 0 ? (
                        todaysTrips.map((trip, index) => (
                            <Animated.View
                                key={trip.id}
                                entering={FadeInDown.delay(400 + (index * 100))}
                            >
                                <TouchableOpacity onPress={() => router.push('/(driver)/routes')} activeOpacity={0.9}>
                                    <GlassCard style={{ marginBottom: 12 }} contentContainerStyle={{ flexDirection: 'row', padding: 0 }}>
                                        <View style={[styles.timeColumn, { borderColor: theme.border }]}>
                                            <Text style={[styles.timeText, { color: theme.text }]}>
                                                {trip.routeId?.timeStart?.split(':')[0]}
                                            </Text>
                                            <Text style={[styles.timeMin, { color: theme.icon }]}>
                                                {trip.routeId?.timeStart?.split(':')[1] || '00'}
                                            </Text>
                                        </View>

                                        <View style={styles.routeInfo}>
                                            <View style={styles.routeAddresses}>
                                                <View style={styles.addressRow}>
                                                    <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
                                                    <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                                                        {trip.routeId?.startPoint?.address || 'Start Location'}
                                                    </Text>
                                                </View>
                                                <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                                                <View style={styles.addressRow}>
                                                    <View style={[styles.timelineDot, { backgroundColor: theme.secondary }]} />
                                                    <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                                                        {trip.routeId?.endPoint?.address || 'End Location'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={[styles.routeFooter, { borderColor: theme.border }]}>
                                                <View style={styles.paxInfo}>
                                                    <User size={14} color={theme.icon} />
                                                    <Text style={[styles.paxText, { color: theme.icon }]}>
                                                        {trip.clients?.length || 0}/{(trip.routeId as any)?.maxPassengers || 4}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.priceTag, { color: '#16a34a' }]}>
                                                    ${trip.routeId?.price}
                                                </Text>
                                            </View>
                                        </View>
                                    </GlassCard>
                                </TouchableOpacity>
                            </Animated.View>
                        ))
                    ) : (
                        <Animated.View entering={FadeInDown.delay(400)}>
                            <GlassCard style={styles.emptyStateCard}>
                                <View style={[styles.emptyIcon, { backgroundColor: theme.background }]}>
                                    <Calendar size={32} color={theme.icon} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: theme.text }]}>No routes scheduled</Text>
                                <Text style={[styles.emptySub, { color: theme.icon }]}>
                                    Your schedule is clear for today. Add a route to start receiving requests.
                                </Text>
                            </GlassCard>
                        </Animated.View>
                    )}
                </View>

                {/* Bottom Spacer */}
                <View style={{ height: 120 }} />
            </ScrollView>

            <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.text }]}
                    onPress={() => router.push('/(driver)/add-route')}
                    activeOpacity={0.8}
                >
                    <Plus size={24} color={theme.background} />
                    <Text style={[styles.fabText, { color: theme.background }]}>New Route</Text>
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
        paddingHorizontal: 20,
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
    },
    greeting: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Notification
    notificationWrapper: {
        marginTop: 12, // Add some top margin since header is gone
        marginBottom: 24,
    },
    notificationCard: {
        borderRadius: 16,
        padding: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    notificationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notificationIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationText: {
        color: '#fff',
        fontSize: 13,
    },
    // KPI
    kpiContainer: {
        marginBottom: 32,
        gap: 12,
    },
    heroCard: {
        borderRadius: 24,
        overflow: 'hidden',
        height: 140,
    },
    heroGradient: {
        flex: 1,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    heroIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    heroValue: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -1,
    },
    heroGraph: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
        height: '100%',
        paddingBottom: 4,
    },
    graphBar: {
        width: 6,
        backgroundColor: '#fff',
        borderRadius: 3,
    },
    metricsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    metricCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        gap: 8,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    metricContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    // Routes
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    sectionAction: {
        fontSize: 13,
        fontWeight: '600',
    },
    // card: { ... }, // Removed generic card style in favor of GlassCard default styles
    routeCard: {
        marginBottom: 12,
        overflow: 'hidden',
    },
    timeColumn: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        width: 70,
        backgroundColor: 'rgba(0,0,0,0.01)',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    timeText: {
        fontSize: 18,
        fontWeight: '800',
    },
    timeMin: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: -2,
    },
    routeInfo: {
        flex: 1,
        padding: 16,
    },
    routeAddresses: {
        gap: 2,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 24,
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    timelineLine: {
        width: 2,
        height: 12,
        marginLeft: 3,
        borderRadius: 1,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    routeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderStyle: 'dashed',
    },
    paxInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    paxText: {
        fontSize: 12,
        fontWeight: '600',
    },
    priceTag: {
        fontSize: 14,
        fontWeight: '700',
    },
    // Empty State
    emptyStateCard: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'transparent',
    },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.6,
        lineHeight: 20,
    },
    // FAB
    fabContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 32,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    fabText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
