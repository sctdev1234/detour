import { Image } from 'expo-image';
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
    Star,
    Zap
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';
import DetourMap from '../../components/Map';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientRequestStore } from '../../store/useClientRequestStore';
import { useTripStore } from '../../store/useTripStore';

export default function ClientDashboard() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { routes, fetchRoutes, isLoading } = useTripStore();
    const { requests } = useClientRequestStore();

    const [greeting, setGreeting] = useState('Hello');

    // Filter for client routes and active trips
    const myRoutes = routes.filter(r => r.role === 'client').slice(0, 3);
    const activeRequest = requests.find(r => ['accepted', 'started'].includes(r.status));
    const nextRoute = myRoutes[0]; // Logic to be improved for "Next" based on time

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');

        fetchRoutes();
        // fetchClientRequests(); // Ensure we have latest requests
    }, []);

    const handleQuickAction = (action: string) => {
        if (action === 'work') {
            // Logic to find work route or create one
            router.push('/(client)/add-route');
        } else if (action === 'home') {
            router.push('/(client)/add-route');
        } else {
            router.push('/(client)/add-route');
        }
    };

    const QuickDestinationBtn = ({ icon: Icon, label, subLabel, onPress, color = theme.primary }: any) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
        >
            <GlassCard style={styles.quickDestBtn} contentContainerStyle={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.quickDestIcon, { backgroundColor: color + '15' }]}>
                    <Icon size={24} color={color} />
                </View>
                <View>
                    <Text style={[styles.quickDestLabel, { color: theme.text }]}>{label}</Text>
                    <Text style={[styles.quickDestSub, { color: theme.icon }]}>{subLabel}</Text>
                </View>
            </GlassCard>
        </TouchableOpacity>
    );

    const StatItem = ({ label, value, icon: Icon }: any) => (
        <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {Icon && <Icon size={12} color={theme.icon} />}
                <Text style={[styles.statLabel, { color: theme.icon }]}>{label}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.background, theme.surface]}
                style={StyleSheet.absoluteFill}
            />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* 1. Header Section - Clean & Personal */}
                <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
                    <View>
                        <Text style={[styles.greeting, { color: theme.icon }]}>{greeting},</Text>
                        <Text style={[styles.userName, { color: theme.text }]}>{user?.fullName || 'Traveler'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(client)/profile')}>
                        <Image
                            source={{ uri: user?.photoURL || 'https://ui-avatars.com/api/?name=' + (user?.fullName || 'User') }}
                            style={styles.avatar}
                            contentFit="cover"
                            transition={500}
                        />
                    </TouchableOpacity>
                </View>

                {/* 2. Primary Action / Active State */}
                <View style={styles.section}>
                    {activeRequest ? (
                        <Animated.View entering={FadeInDown.springify()}>
                            <GlassCard style={[styles.activeCard]} contentContainerStyle={{ backgroundColor: theme.primary, padding: 0 }}>
                                <View style={{ padding: 20 }}>
                                    <View style={styles.activeCardHeader}>
                                        <Text style={styles.activeCardTitle}>Current Trip</Text>
                                        <View style={styles.activeStatusBadge}>
                                            <Text style={styles.activeStatusText}>{activeRequest.status}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.activeCardContent}>
                                        <View style={styles.TripLocations}>
                                            <Text style={styles.tripLocationText} numberOfLines={1}>📍 {activeRequest.startPoint.address}</Text>
                                            <View style={styles.verticalLine} />
                                            <Text style={styles.tripLocationText} numberOfLines={1}>🏁 {activeRequest.endPoint.address}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.trackBtn}
                                            onPress={() => router.push({ pathname: '/(client)/trip-details', params: { requestId: activeRequest.id } })}
                                        >
                                            <Text style={styles.trackBtnText}>Track Driver</Text>
                                            <ArrowRight size={16} color={theme.primary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </GlassCard>
                        </Animated.View>
                    ) : (
                        <Animated.View entering={FadeInDown.springify()}>
                            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>Where are you going?</Text>

                            <TouchableOpacity
                                onPress={() => router.push('/(client)/add-route')}
                                activeOpacity={0.9}
                            >
                                <GlassCard style={styles.searchBar} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                                    <Search size={20} color={theme.icon} />
                                    <Text style={[styles.searchPlaceholder, { color: theme.icon }]}>Search destination...</Text>
                                </GlassCard>
                            </TouchableOpacity>

                            <View style={[styles.dashboardMapContainer, { borderColor: theme.border, borderRadius: 24, overflow: 'hidden', marginBottom: 16 }]}>
                                <DetourMap
                                    mode="picker"
                                    readOnly={true}
                                    theme={theme}
                                    height={180}
                                    savedPlaces={user?.savedPlaces}
                                />
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 12, paddingRight: 24 }}
                                style={{ overflow: 'visible' }}
                            >
                                {user?.savedPlaces && user.savedPlaces.length > 0 ? (
                                    user.savedPlaces.map((place, index) => (
                                        <View key={place._id || index} style={{ width: 160 }}>
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
                                        <View style={{ width: 160 }}>
                                            <QuickDestinationBtn
                                                icon={Briefcase}
                                                label="Work"
                                                subLabel="Commute"
                                                onPress={() => handleQuickAction('work')}
                                            />
                                        </View>
                                        <View style={{ width: 160 }}>
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

                {/* 3. My Commutes (Recurring Routes) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>My Commutes</Text>
                        <TouchableOpacity onPress={() => router.push('/(client)/routes')}>
                            <Text style={{ color: theme.primary, fontWeight: '600' }}>Manage</Text>
                        </TouchableOpacity>
                    </View>

                    {myRoutes.length > 0 ? (
                        <View style={styles.routesList}>
                            {myRoutes.map((route, index) => (
                                <Animated.View
                                    key={route.id}
                                    entering={FadeInRight.delay(index * 100).springify()}
                                >
                                    <GlassCard style={styles.routeCard} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                        <View style={[styles.routeIcon, { backgroundColor: theme.background }]}>
                                            <Clock size={20} color={theme.primary} />
                                        </View>
                                        <View style={styles.routeInfo}>
                                            <View style={styles.routeHeader}>
                                                <Text style={[styles.routeTime, { color: theme.text }]}>{route.timeStart}</Text>
                                                <View style={[styles.daysBadge, { backgroundColor: theme.background }]}>
                                                    <Text style={[styles.daysText, { color: theme.icon }]}>
                                                        {route.days.length > 5 ? 'Daily' : `${route.days.length} days`}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.routeAddress, { color: theme.icon }]} numberOfLines={1}>
                                                To {route.endPoint.address}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.findMatchBtn, { backgroundColor: theme.primary + '20' }]}
                                            onPress={() => router.push({ pathname: '/(client)/find-matches', params: { routeId: route.id } })}
                                        >
                                            <Text style={[styles.findMatchText, { color: theme.primary }]}>Find</Text>
                                        </TouchableOpacity>
                                    </GlassCard>
                                </Animated.View>
                            ))}
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => router.push('/(client)/add-route')}>
                            <GlassCard style={styles.emptyState} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                <View style={[styles.emptyIconData, { backgroundColor: theme.primary + '15' }]}>
                                    <Navigation size={24} color={theme.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.emptyTitle, { color: theme.text }]}>Set up your commute</Text>
                                    <Text style={[styles.emptyDesc, { color: theme.icon }]}>Get matches for your daily route.</Text>
                                </View>
                                <ArrowRight size={20} color={theme.icon} />
                            </GlassCard>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 4. Weekly Activity / Stats */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>This Week</Text>
                    <GlassCard style={styles.statsContainer} contentContainerStyle={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <StatItem label="Rides" value="0" icon={Navigation} />
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <StatItem label="Saved" value="$0" icon={Star} />
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <StatItem label="Hours" value="0" icon={Clock} />
                    </GlassCard>
                </View>

                {/* 5. Marketing / Pro Tip */}
                <Animated.View entering={FadeInDown.delay(400)} style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                    <LinearGradient
                        colors={[theme.secondary || '#5856D6', '#8E8CFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.proTip}
                    >
                        <View style={styles.proContent}>
                            <Zap size={24} color="#FFF" fill="#FFF" />
                            <View>
                                <Text style={styles.proTitle}>Go Premium</Text>
                                <Text style={styles.proDesc}>Get priority matching & lower fees.</Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color="#FFF" />
                    </LinearGradient>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    greeting: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#fff',
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.5,
    },

    // Search & Quick Destinations
    searchBar: {
        borderRadius: 16,
        marginBottom: 16,
    },
    searchPlaceholder: {
        fontSize: 16,
        fontWeight: '500',
    },
    quickDestGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    quickDestBtn: {
        borderRadius: 20,
    },
    quickDestIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickDestLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    quickDestSub: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Active Card
    activeCard: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    activeCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    activeCardTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    activeStatusBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeStatusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    activeCardContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
    },
    TripLocations: {
        marginBottom: 16,
        gap: 8,
    },
    tripLocationText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    verticalLine: {
        height: 12,
        width: 1,
        backgroundColor: '#E5E5E5',
        marginLeft: 6,
    },
    trackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: '#F2F6FF',
        borderRadius: 12,
        gap: 8,
    },
    trackBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0066FF',
    },

    // Routes List
    routesList: {
        gap: 12,
    },
    routeCard: {
        borderRadius: 20,
    },
    routeIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    routeInfo: {
        flex: 1,
    },
    routeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    routeTime: {
        fontSize: 16,
        fontWeight: '700',
    },
    daysBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    daysText: {
        fontSize: 11,
        fontWeight: '600',
    },
    routeAddress: {
        fontSize: 13,
        fontWeight: '500',
    },
    findMatchBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    findMatchText: {
        fontSize: 13,
        fontWeight: '700',
    },

    // Empty State
    emptyState: {
        borderRadius: 20,
    },
    emptyIconData: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    emptyDesc: {
        fontSize: 13,
        fontWeight: '500',
    },

    // Stats
    statsContainer: {
        borderRadius: 24,
    },
    statItem: {
        alignItems: 'center',
        gap: 6,
        flex: 1, // Distribute evenly
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        height: '80%', // reduce height slightly
        alignSelf: 'center',
    },

    // Pro Tip
    proTip: {
        padding: 20,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // marginTop: 8, // Removed margin from style, handled in view
    },
    proContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    proTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    proDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '500',
    },
    dashboardMapContainer: {
        borderWidth: 1,
        // @ts-ignore
        boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
        elevation: 2,
    },
});
