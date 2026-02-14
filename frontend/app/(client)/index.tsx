import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ArrowRight,
    Briefcase,
    ChevronRight,
    Clock,
    Home,
    MapPin,
    Navigation,
    Search,
    TrendingUp,
    Zap
} from 'lucide-react-native';
import React from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../../components/GlassCard';
import DetourMap from '../../components/Map';
import CardStatItem from '../../components/ui/CardStatItem';
import { Colors } from '../../constants/theme';
import { useClientRequests, useRoutes } from '../../hooks/api/useTripQueries';
import { useAuthStore } from '../../store/useAuthStore';

export default function ClientDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { data: routes } = useRoutes();
    const { data: requests } = useClientRequests();

    // Filter for client routes and active trips
    const myRoutes = React.useMemo(() => routes?.filter(r => r.role === 'client').slice(0, 3) || [], [routes]);
    const activeRequest = React.useMemo(() => requests?.find((r: any) => ['accepted', 'started', 'picked_up'].includes(r.status)), [requests]);

    const handleQuickAction = (action: string) => {
        router.push('/(client)/add-route');
    };

    const QuickDestinationBtn = ({ icon: Icon, label, subLabel, onPress, color = theme.primary }: any) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
        >
            <GlassCard style={styles.quickDestBtn} contentContainerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.quickDestIcon, { backgroundColor: color + '15' }]}>
                    <Icon size={22} color={color} strokeWidth={2.5} />
                </View>
                <View>
                    <Text style={[styles.quickDestLabel, { color: theme.text }]}>{label}</Text>
                    <Text style={[styles.quickDestSub, { color: theme.icon }]}>{subLabel}</Text>
                </View>
            </GlassCard>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            <LinearGradient
                colors={[theme.background, theme.surface]}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
            >
                {/* 1. Active State / Search */}
                <View style={styles.section}>
                    {activeRequest ? (
                        <Animated.View entering={FadeInDown.springify()}>
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => router.push({ pathname: '/(client)/trip-details', params: { requestId: activeRequest.id } })}
                            >
                                <LinearGradient
                                    colors={['#2563EB', '#4F46E5']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.activeCard}
                                >
                                    <View style={styles.activeCardContent}>
                                        <View style={styles.activeCardHeader}>
                                            <View style={styles.pulsingDot} />
                                            <Text style={styles.activeCardTitle}>Trip in Progress</Text>
                                            <View style={styles.activeStatusBadge}>
                                                <Text style={styles.activeStatusText}>{activeRequest.status.replace('_', ' ')}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.tripRouteContainer}>
                                            <View style={styles.timelineContainer}>
                                                <View style={[styles.timelineDot, { backgroundColor: '#fff' }]} />
                                                <View style={[styles.timelineLine, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                                                <View style={[styles.timelineDot, { backgroundColor: '#fff', opacity: 0.5 }]} />
                                            </View>
                                            <View style={styles.tripDetails}>
                                                <Text style={styles.tripLocationTextWhite} numberOfLines={1}>{activeRequest.startPoint?.address || 'Start'}</Text>
                                                <View style={{ height: 16 }} />
                                                <Text style={styles.tripLocationTextWhite} numberOfLines={1}>{activeRequest.endPoint?.address || 'End'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.trackBtn}>
                                            <Text style={styles.trackBtnText}>Track Driver</Text>
                                            <ArrowRight size={16} color="#fff" />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    ) : (
                        <Animated.View entering={FadeInDown.springify()}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Where to?</Text>

                            <TouchableOpacity
                                onPress={() => router.push('/(client)/add-route')}
                                activeOpacity={0.9}
                                style={styles.searchContainer}
                            >
                                <GlassCard style={styles.searchBar} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                                    <Search size={20} color={theme.primary} strokeWidth={2.5} />
                                    <Text style={[styles.searchPlaceholder, { color: theme.icon }]}>Search destination...</Text>
                                </GlassCard>
                            </TouchableOpacity>

                            {/* Saved Place Map Preview */}
                            <View style={[styles.mapPreview, { borderColor: theme.border }]}>
                                <DetourMap
                                    mode="picker"
                                    readOnly={true}
                                    theme={theme}
                                    height={160}
                                    savedPlaces={user?.savedPlaces}
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.05)']}
                                    style={StyleSheet.absoluteFill}
                                    pointerEvents="none"
                                />
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 12, paddingRight: 24 }}
                                style={styles.quickActionsScroll}
                            >
                                {user?.savedPlaces && user.savedPlaces.length > 0 ? (
                                    user.savedPlaces.map((place, index) => (
                                        <View key={place._id || index} style={{ width: 150 }}>
                                            <QuickDestinationBtn
                                                icon={place.icon === 'home' ? Home : place.icon === 'work' ? Briefcase : MapPin}
                                                label={place.label}
                                                subLabel={place.address.split(',')[0]}
                                                color={place.icon === 'home' ? (theme.secondary || '#10b981') : theme.primary}
                                                onPress={() => router.push({
                                                    pathname: '/(client)/add-route',
                                                    params: {
                                                        destLat: place.latitude,
                                                        destLng: place.longitude,
                                                        destAddress: place.address,
                                                        fromCurrent: 'true'
                                                    }
                                                })}
                                            />
                                        </View>
                                    ))
                                ) : (
                                    <>
                                        <View style={{ width: 150 }}>
                                            <QuickDestinationBtn
                                                icon={Briefcase}
                                                label="Work"
                                                subLabel="Commute"
                                                onPress={() => handleQuickAction('work')}
                                            />
                                        </View>
                                        <View style={{ width: 150 }}>
                                            <QuickDestinationBtn
                                                icon={Home}
                                                label="Home"
                                                subLabel="Return"
                                                color={theme.secondary || '#10b981'}
                                                onPress={() => handleQuickAction('home')}
                                            />
                                        </View>
                                    </>
                                )}
                            </ScrollView>
                        </Animated.View>
                    )}
                </View>

                {/* 2. My Commutes */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>My Commutes</Text>
                        <TouchableOpacity onPress={() => router.push('/(client)/routes')}>
                            <Text style={[styles.sectionAction, { color: theme.primary }]}>Manage</Text>
                        </TouchableOpacity>
                    </View>

                    {myRoutes.length > 0 ? (
                        <View style={styles.routesList}>
                            {myRoutes.map((route, index) => (
                                <Animated.View
                                    key={route.id}
                                    entering={FadeInRight.delay(index * 100).springify()}
                                >
                                    <GlassCard style={styles.routeCard} contentContainerStyle={{ padding: 16 }}>
                                        <View style={styles.routeHeader}>
                                            <View style={styles.timeContainer}>
                                                <Clock size={16} color={theme.primary} />
                                                <Text style={[styles.routeTime, { color: theme.text }]}>{route.timeStart}</Text>
                                            </View>
                                            <View style={[styles.daysBadge, { backgroundColor: theme.primary + '15' }]}>
                                                <Text style={[styles.daysText, { color: theme.primary }]}>
                                                    {route.days.length > 5 ? 'Daily' : `${route.days.length} days`}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.routeBody}>
                                            <View style={styles.timelineContainer}>
                                                <View style={[styles.timelineDot, { borderColor: theme.primary }]} />
                                                <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                                                <View style={[styles.timelineDot, { borderColor: theme.secondary || '#10B981' }]} />
                                            </View>
                                            <View style={styles.tripDetails}>
                                                <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>Current Location</Text>
                                                <View style={{ height: 12 }} />
                                                <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>{route.endPoint.address}</Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.findMatchBtn, { backgroundColor: theme.primary + '10' }]}
                                            onPress={() => router.push({ pathname: '/(client)/find-matches', params: { routeId: route.id } })}
                                        >
                                            <Text style={[styles.findMatchText, { color: theme.primary }]}>Find Driver</Text>
                                            <ArrowRight size={16} color={theme.primary} />
                                        </TouchableOpacity>
                                    </GlassCard>
                                </Animated.View>
                            ))}
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => router.push('/(client)/add-route')}>
                            <GlassCard style={styles.emptyState} contentContainerStyle={{ alignItems: 'center', padding: 32 }}>
                                <View style={[styles.emptyIconData, { backgroundColor: theme.primary + '10' }]}>
                                    <Navigation size={32} color={theme.primary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: theme.text }]}>No commutes yet</Text>
                                <Text style={[styles.emptyDesc, { color: theme.icon }]}>Set up a recurring route to get matches instantly.</Text>
                            </GlassCard>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 3. Your Activity Stats */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 16 }]}>Your Activity</Text>
                    <View style={styles.statsRow}>
                        <GlassCard style={styles.statCard} contentContainerStyle={{ padding: 16 }}>
                            <CardStatItem
                                label="Total Rides"
                                value={user?.stats?.tripsDone || '0'}
                                icon={Navigation}
                                color={theme.primary}
                            />
                        </GlassCard>
                        <GlassCard style={styles.statCard} contentContainerStyle={{ padding: 16 }}>
                            <CardStatItem
                                label="Total Spent"
                                value={`${user?.spending?.total || '0'} MAD`}
                                icon={TrendingUp}
                                color="#F59E0B"
                                onPress={() => router.push('/finance/wallet')}
                            />
                        </GlassCard>
                    </View>
                </View>

                {/* 4. Premium Banner */}
                <Animated.View entering={FadeInDown.delay(400)} style={{ marginBottom: 40, marginHorizontal: 4 }}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/finance/wallet')}>
                        <LinearGradient
                            colors={['#8B5CF6', '#EC4899']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.premiumBanner}
                        >
                            <View style={styles.premiumContent}>
                                <View style={styles.premiumIconBox}>
                                    <Zap size={24} color="#FFF" fill="#FFF" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                                    <Text style={styles.premiumDesc}>Get priority matching & lower booking fees.</Text>
                                </View>
                                <ChevronRight size={20} color="#FFF" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>
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
        paddingBottom: 100,
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 32,
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
        marginBottom: 8,
    },
    sectionAction: {
        fontSize: 14,
        fontWeight: '700',
    },

    // Search & Quick Actions
    searchContainer: {
        marginBottom: 20,
        marginTop: 8,
    },
    searchBar: {
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    searchPlaceholder: {
        fontSize: 16,
        fontWeight: '500',
    },
    mapPreview: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 1,
    },
    quickActionsScroll: {
        overflow: 'visible',
    },
    quickDestBtn: {
        borderRadius: 20,
    },
    quickDestIcon: {
        width: 44,
        height: 44,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickDestLabel: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    quickDestSub: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Active Card
    activeCard: {
        borderRadius: 28,
        padding: 2, // Gradient border effect if needed, usually just fill
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    activeCardContent: {
        padding: 20,
    },
    activeCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    pulsingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        marginRight: 8,
    },
    activeCardTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },
    activeStatusBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeStatusText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    tripRouteContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    tripLocationTextWhite: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    trackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        gap: 8,
    },
    trackBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },

    // Routes List (Modern)
    routesList: {
        gap: 16,
    },
    routeCard: {
        borderRadius: 24,
    },
    routeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    routeTime: {
        fontSize: 18,
        fontWeight: '700',
    },
    daysBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    daysText: {
        fontSize: 12,
        fontWeight: '700',
    },
    routeBody: {
        flexDirection: 'row',
        marginBottom: 16,
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
        backgroundColor: 'transparent',
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
    findMatchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 14,
        gap: 8,
    },
    findMatchText: {
        fontSize: 14,
        fontWeight: '700',
    },

    // Empty State
    emptyState: {
        borderRadius: 24,
    },
    emptyIconData: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    emptyDesc: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: '80%',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statCard: {
        flex: 1,
        borderRadius: 24,
    },

    // Premium Banner
    premiumBanner: {
        borderRadius: 28,
        padding: 20,
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    premiumContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    premiumIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    premiumTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    premiumDesc: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '500',
    },
});
