import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ArrowUpRight,
    Car,
    ChevronDown,
    ChevronUp,
    Clock,
    DollarSign,
    MapPin,
    Navigation,
    Star,
    Timer,
    User,
    Users,
    Wallet,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import Animated, {
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useDriverRequests, useTrips } from '../../hooks/api/useTripQueries';
import { useCountdownDate } from '../../hooks/useCountdown';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useRatingStore } from '../../store/useRatingStore';
import { getNextTripOccurrence, IN_PROGRESS_STATUSES } from '../../utils/timeUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.55;

export default function DashboardBottomSheet() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { driverStatus, bottomSheetState, setBottomSheetState } = useDashboardStore();
    const [isExpanded, setIsExpanded] = useState(false);

    const getAverageRating = useRatingStore((state) => state.getAverageRating);
    const avgRating = getAverageRating(user?.id || '');

    const { data: allTrips } = useTrips();
    const { data: requests } = useDriverRequests();

    // Filter trips for current driver
    const trips = allTrips?.filter((t: any) =>
        t.driverId?._id === user?.id ||
        t.driverId?.id === user?.id ||
        t.driverId === user?.id
    ) || [];

    // Check for active trips
    const activeTrip = trips.find((t: any) =>
        IN_PROGRESS_STATUSES.includes(t.status) ||
        t.status === 'active'
    );

    // Find next trip
    let nextTripDate: Date | null = null;
    let nextTripRef: any = null;

    trips.forEach((t: any) => {
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED' || t.status === 'completed' || t.status === 'cancelled') return;
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

    const pendingRequestsCount = requests?.filter((r: any) => r.status === 'pending').length || 0;
    const totalRoutes = trips.length;
    const weeklyPotential = trips.reduce(
        (acc: number, t: any) => acc + ((t.routeId?.price || 0) * (t.routeId?.days?.length || 0)),
        0
    );

    const toggleSheet = useCallback(() => {
        setIsExpanded(!isExpanded);
        setBottomSheetState(isExpanded ? 'collapsed' : 'expanded');
    }, [isExpanded]);

    const bgColor = colorScheme === 'dark'
        ? 'rgba(28, 28, 30, 0.95)'
        : 'rgba(255, 255, 255, 0.95)';

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios'
        ? { intensity: 90, tint: colorScheme }
        : {};

    return (
        <View style={[
            styles.wrapper,
            {
                height: isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
                paddingBottom: insets.bottom,
            }
        ]}>
            <Container
                {...containerProps}
                style={[
                    styles.container,
                    Platform.OS !== 'ios' && { backgroundColor: bgColor },
                ]}
            >
                {/* Handle Bar + Toggle */}
                <TouchableOpacity
                    style={styles.handleArea}
                    onPress={toggleSheet}
                    activeOpacity={0.9}
                >
                    <View style={[styles.handle, {
                        backgroundColor: colorScheme === 'dark'
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(0,0,0,0.12)',
                    }]} />
                </TouchableOpacity>

                {/* COLLAPSED VIEW */}
                {!isExpanded && (
                    <TouchableOpacity
                        style={styles.collapsedContent}
                        onPress={toggleSheet}
                        activeOpacity={0.9}
                    >
                        {activeTrip ? (
                            // Active Trip Summary
                            <View style={styles.collapsedRow}>
                                <View style={[styles.statusIndicator, { backgroundColor: '#ef4444' }]}>
                                    <View style={styles.pulsingDot} />
                                </View>
                                <View style={styles.collapsedTextBlock}>
                                    <Text style={[styles.collapsedTitle, { color: theme.text }]}>
                                        Trip in Progress
                                    </Text>
                                    <Text style={[styles.collapsedSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                        {activeTrip.routeId?.startPoint?.address?.split(',')[0]} → {activeTrip.routeId?.endPoint?.address?.split(',')[0]}
                                    </Text>
                                </View>
                                <View style={styles.collapsedAction}>
                                    <ArrowUpRight size={18} color={theme.primary} />
                                </View>
                            </View>
                        ) : nextTripRef ? (
                            // Next Trip Summary
                            <View style={styles.collapsedRow}>
                                <View style={[styles.statusIndicator, { backgroundColor: theme.primary + '15' }]}>
                                    <Timer size={18} color={theme.primary} />
                                </View>
                                <View style={styles.collapsedTextBlock}>
                                    <Text style={[styles.collapsedTitle, { color: theme.text }]}>
                                        Next Trip {nextTripCountdown ? `in ${nextTripCountdown}` : ''}
                                    </Text>
                                    <Text style={[styles.collapsedSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                        {nextTripRef.routeId?.startPoint?.address?.split(',')[0]} → {nextTripRef.routeId?.endPoint?.address?.split(',')[0]}
                                    </Text>
                                </View>
                                <View style={styles.collapsedAction}>
                                    <ChevronUp size={18} color={theme.icon} />
                                </View>
                            </View>
                        ) : (
                            // No Active Trip
                            <View style={styles.collapsedRow}>
                                <View style={[styles.statusIndicator, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                    <Navigation size={18} color={theme.icon} />
                                </View>
                                <View style={styles.collapsedTextBlock}>
                                    <Text style={[styles.collapsedTitle, { color: theme.text }]}>
                                        No Active Trip
                                    </Text>
                                    <Text style={[styles.collapsedSub, { color: theme.textSecondary }]}>
                                        {totalRoutes > 0
                                            ? `${totalRoutes} route${totalRoutes > 1 ? 's' : ''} scheduled`
                                            : 'Create a route to get started'
                                        }
                                    </Text>
                                </View>
                                <View style={styles.collapsedAction}>
                                    <ChevronUp size={18} color={theme.icon} />
                                </View>
                            </View>
                        )}

                        {/* Quick Stats Row */}
                        <View style={styles.quickStats}>
                            <View style={styles.quickStatItem}>
                                <Car size={14} color={theme.icon} />
                                <Text style={[styles.quickStatValue, { color: theme.text }]}>{totalRoutes}</Text>
                                <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>Routes</Text>
                            </View>
                            <View style={[styles.quickStatDivider, { backgroundColor: theme.border }]} />
                            <View style={styles.quickStatItem}>
                                <DollarSign size={14} color={theme.icon} />
                                <Text style={[styles.quickStatValue, { color: theme.text }]}>{weeklyPotential}</Text>
                                <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>MAD/wk</Text>
                            </View>
                            <View style={[styles.quickStatDivider, { backgroundColor: theme.border }]} />
                            <View style={styles.quickStatItem}>
                                <Star size={14} color="#EAB308" />
                                <Text style={[styles.quickStatValue, { color: theme.text }]}>
                                    {(user?.stats?.rating || avgRating).toFixed(1)}
                                </Text>
                                <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>Rating</Text>
                            </View>
                            {pendingRequestsCount > 0 && (
                                <>
                                    <View style={[styles.quickStatDivider, { backgroundColor: theme.border }]} />
                                    <TouchableOpacity
                                        style={styles.quickStatItem}
                                        onPress={() => router.push('/(driver)/requests')}
                                    >
                                        <Users size={14} color={theme.primary} />
                                        <Text style={[styles.quickStatValue, { color: theme.primary }]}>{pendingRequestsCount}</Text>
                                        <Text style={[styles.quickStatLabel, { color: theme.primary }]}>Requests</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* EXPANDED VIEW */}
                {isExpanded && (
                    <ScrollView
                        style={styles.expandedContent}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        {/* Close handle */}
                        <TouchableOpacity
                            style={styles.closeRow}
                            onPress={toggleSheet}
                        >
                            <Text style={[styles.expandedSectionTitle, { color: theme.text }]}>
                                {activeTrip ? 'Active Trip' : 'Dashboard'}
                            </Text>
                            <ChevronDown size={20} color={theme.icon} />
                        </TouchableOpacity>

                        {activeTrip ? (
                            /* ---- ACTIVE TRIP DETAILS ---- */
                            <Animated.View entering={FadeInUp.springify()}>
                                {/* Trip Route */}
                                <View style={[styles.tripCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
                                    <View style={styles.tripRouteRow}>
                                        <View style={styles.routeTimeline}>
                                            <View style={[styles.timelineDot, { borderColor: '#10b981' }]} />
                                            <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                                            <View style={[styles.timelineDot, { borderColor: '#ef4444', backgroundColor: '#ef4444' }]} />
                                        </View>
                                        <View style={styles.routeAddresses}>
                                            <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                                                {activeTrip.routeId?.startPoint?.address || 'Start'}
                                            </Text>
                                            <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                                                {activeTrip.routeId?.endPoint?.address || 'End'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Trip Stats */}
                                    <View style={styles.tripStats}>
                                        <View style={styles.tripStatItem}>
                                            <Users size={14} color={theme.icon} />
                                            <Text style={[styles.tripStatText, { color: theme.text }]}>
                                                {activeTrip.clients?.length || 0} passengers
                                            </Text>
                                        </View>
                                        <View style={styles.tripStatItem}>
                                            <Clock size={14} color={theme.icon} />
                                            <Text style={[styles.tripStatText, { color: theme.text }]}>
                                                {activeTrip.routeId?.timeStart || 'N/A'}
                                            </Text>
                                        </View>
                                        <View style={styles.tripStatItem}>
                                            <DollarSign size={14} color="#10B981" />
                                            <Text style={[styles.tripStatText, { color: '#10B981' }]}>
                                                {activeTrip.routeId?.price || 0} MAD
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Passengers List */}
                                {activeTrip.clients?.length > 0 && (
                                    <View style={styles.passengerSection}>
                                        <Text style={[styles.expandedLabel, { color: theme.textSecondary }]}>
                                            PASSENGERS
                                        </Text>
                                        {activeTrip.clients.map((client: any, idx: number) => (
                                            <View key={idx} style={[styles.passengerRow, { borderColor: theme.border }]}>
                                                <View style={[styles.passengerAvatar, { backgroundColor: theme.primary + '15' }]}>
                                                    <User size={16} color={theme.primary} />
                                                </View>
                                                <View style={styles.passengerInfo}>
                                                    <Text style={[styles.passengerName, { color: theme.text }]}>
                                                        {client.userId?.fullName || 'Passenger'}
                                                    </Text>
                                                    <Text style={[styles.passengerStatus, { color: theme.textSecondary }]}>
                                                        {client.status || 'Waiting'} • {client.seats || 1} seat(s)
                                                    </Text>
                                                </View>
                                                <Text style={[styles.passengerPrice, { color: '#10B981' }]}>
                                                    {client.price || 0} MAD
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* View Trip Action */}
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: theme.primary }]}
                                    onPress={() => router.push(`/active-trip/${activeTrip._id || activeTrip.id}`)}
                                >
                                    <Text style={styles.actionButtonText}>Open Trip Execution</Text>
                                    <ArrowUpRight size={18} color="#fff" />
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            /* ---- NO ACTIVE TRIP: DASHBOARD OVERVIEW ---- */
                            <Animated.View entering={FadeInUp.springify()}>
                                {/* Stats Grid */}
                                <View style={styles.statsGrid}>
                                    <View style={[styles.statCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                        <View style={[styles.statIconBox, { backgroundColor: theme.primary + '12' }]}>
                                            <Car size={18} color={theme.primary} />
                                        </View>
                                        <Text style={[styles.statValue, { color: theme.text }]}>{totalRoutes}</Text>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active Routes</Text>
                                    </View>
                                    <View style={[styles.statCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                        <View style={[styles.statIconBox, { backgroundColor: '#10B981' + '12' }]}>
                                            <Wallet size={18} color="#10B981" />
                                        </View>
                                        <Text style={[styles.statValue, { color: theme.text }]}>{user?.balance?.toFixed(0) || '0'}</Text>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Balance (MAD)</Text>
                                    </View>
                                </View>

                                <View style={styles.statsGrid}>
                                    <View style={[styles.statCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                        <View style={[styles.statIconBox, { backgroundColor: '#EAB308' + '12' }]}>
                                            <Star size={18} color="#EAB308" />
                                        </View>
                                        <Text style={[styles.statValue, { color: theme.text }]}>{(user?.stats?.rating || avgRating).toFixed(1)}</Text>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rating</Text>
                                    </View>
                                    <View style={[styles.statCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                        <View style={[styles.statIconBox, { backgroundColor: '#8B5CF6' + '12' }]}>
                                            <DollarSign size={18} color="#8B5CF6" />
                                        </View>
                                        <Text style={[styles.statValue, { color: theme.text }]}>{weeklyPotential}</Text>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Weekly (MAD)</Text>
                                    </View>
                                </View>

                                {/* Next Trip Card */}
                                {nextTripRef && (
                                    <>
                                        <Text style={[styles.expandedLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                                            UPCOMING TRIP
                                        </Text>
                                        <View style={[styles.tripCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
                                            <View style={styles.nextTripHeader}>
                                                <View style={[styles.timeBadge, { backgroundColor: theme.primary + '12' }]}>
                                                    <Clock size={14} color={theme.primary} />
                                                    <Text style={[styles.timeBadgeText, { color: theme.primary }]}>
                                                        {nextTripRef.routeId?.timeStart}
                                                    </Text>
                                                </View>
                                                {nextTripCountdown && (
                                                    <View style={[styles.timeBadge, { backgroundColor: '#F59E0B' + '12' }]}>
                                                        <Timer size={14} color="#F59E0B" />
                                                        <Text style={[styles.timeBadgeText, { color: '#F59E0B' }]}>
                                                            {nextTripCountdown}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.tripRouteRow}>
                                                <View style={styles.routeTimeline}>
                                                    <View style={[styles.timelineDot, { borderColor: '#10b981' }]} />
                                                    <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                                                    <View style={[styles.timelineDot, { borderColor: '#ef4444', backgroundColor: '#ef4444' }]} />
                                                </View>
                                                <View style={styles.routeAddresses}>
                                                    <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                                                        {nextTripRef.routeId?.startPoint?.address || 'Start'}
                                                    </Text>
                                                    <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                                                        {nextTripRef.routeId?.endPoint?.address || 'End'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={[styles.nextTripFooter, { borderTopColor: theme.border }]}>
                                                <View style={styles.tripStatItem}>
                                                    <Users size={14} color={theme.icon} />
                                                    <Text style={[styles.tripStatText, { color: theme.textSecondary }]}>
                                                        {nextTripRef.clients?.length || 0} passengers
                                                    </Text>
                                                </View>
                                                <View style={[styles.priceBadge, { backgroundColor: '#10B981' + '12' }]}>
                                                    <Text style={[styles.priceText, { color: '#10B981' }]}>
                                                        {nextTripRef.routeId?.price || 0} MAD/seat
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </>
                                )}

                                {/* Quick Actions */}
                                <View style={styles.quickActionsRow}>
                                    <TouchableOpacity
                                        style={[styles.quickActionBtn, { backgroundColor: theme.primary }]}
                                        onPress={() => router.push('/(driver)/add-route')}
                                    >
                                        <Plus size={18} color="#fff" />
                                        <Text style={styles.quickActionText}>New Route</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.quickActionBtn, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                                        onPress={() => router.push('/finance/wallet')}
                                    >
                                        <Wallet size={18} color={theme.text} />
                                        <Text style={[styles.quickActionText, { color: theme.text }]}>Wallet</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        )}
                    </ScrollView>
                )}
            </Container>
        </View>
    );
}

const Plus = ({ size, color, ...props }: any) => {
    const { Plus: PlusIcon } = require('lucide-react-native');
    return <PlusIcon size={size} color={color} {...props} />;
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 95,
    },
    container: {
        flex: 1,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 12,
    },
    handleArea: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    // Collapsed
    collapsedContent: {
        paddingHorizontal: 20,
    },
    collapsedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 14,
    },
    statusIndicator: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulsingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    collapsedTextBlock: {
        flex: 1,
    },
    collapsedTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    collapsedSub: {
        fontSize: 13,
        fontWeight: '500',
    },
    collapsedAction: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Quick Stats
    quickStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    quickStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    quickStatValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    quickStatLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    quickStatDivider: {
        width: 1,
        height: 16,
    },
    // Expanded
    expandedContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    closeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    expandedSectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    expandedLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 10,
    },
    // Trip Card
    tripCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    tripRouteRow: {
        flexDirection: 'row',
        gap: 12,
    },
    routeTimeline: {
        alignItems: 'center',
        width: 14,
        paddingVertical: 2,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
        minHeight: 20,
    },
    routeAddresses: {
        flex: 1,
        justifyContent: 'space-between',
        gap: 16,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '600',
    },
    tripStats: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        borderStyle: 'dashed',
    },
    tripStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tripStatText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Passengers
    passengerSection: {
        marginBottom: 12,
    },
    passengerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    passengerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    passengerInfo: {
        flex: 1,
    },
    passengerName: {
        fontSize: 14,
        fontWeight: '700',
    },
    passengerStatus: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    passengerPrice: {
        fontSize: 14,
        fontWeight: '800',
    },
    // Action Button
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'flex-start',
        gap: 8,
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Next Trip
    nextTripHeader: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    timeBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    nextTripFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderStyle: 'dashed',
    },
    priceBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    priceText: {
        fontSize: 13,
        fontWeight: '700',
    },
    // Quick Actions
    quickActionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    quickActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    quickActionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
