import { useRouter } from 'expo-router';
import {
    Briefcase,
    ChevronRight,
    Clock,
    Home,
    MapPin,
    Search,
    Star,
    User
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useCarStore } from '../../store/useCarStore';
import { ClientRequest, useClientRequestStore } from '../../store/useClientRequestStore';
import { useRatingStore } from '../../store/useRatingStore';
import { useTripStore } from '../../store/useTripStore';

export default function ClientDashboard() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { trips } = useTripStore();
    const { requests } = useClientRequestStore();
    const { cars } = useCarStore();

    const getAverageRating = useRatingStore((state) => state.getAverageRating);
    const avgRating = getAverageRating(user?.id || '');

    const [greeting, setGreeting] = useState('Hello');

    // Get recent completed trips
    const recentTrips = requests
        .filter(r => r.status === 'completed' || r.status === 'accepted')
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5); // Last 5 trips

    // Get top rated drivers (simulated by filtering active trips)
    // In a real app, this would query users with high ratings
    const recommendedTrips = trips.slice(0, 5);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    const handleQuickAction = (action: string) => {
        // Find trips matching "Home" or "Work" based on destination alias (if it existed) or just search logic
        // For now, we'll route to search with a pre-filled query param if we had that logic, 
        // or just to search screen to keep it simple but functional.
        router.push('/(client)/search');
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
        // Calculate a dummy distance or use real if available
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

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.welcomeText, { color: theme.icon }]}>{greeting},</Text>
                    <Text style={[styles.nameText, { color: theme.text }]}>{user?.fullName || 'Traveler'}</Text>
                    {avgRating > 0 && (
                        <View style={[styles.ratingBadge, { backgroundColor: '#FFCC0020' }]}>
                            <Star size={12} color="#EBAC00" fill="#EBAC00" />
                            <Text style={[styles.ratingText, { color: '#EBAC00' }]}>{avgRating.toFixed(1)}</Text>
                        </View>
                    )}
                </View>

            </View>

            {/* Search Bar */}
            <TouchableOpacity
                style={styles.searchBarContainer}
                onPress={() => router.push('/(client)/request-ride')}
                activeOpacity={0.9}
            >
                <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.primary + '40' }]}>
                    <Search size={22} color={theme.primary} />
                    <Text style={[styles.searchPlaceholder, { color: theme.icon }]}>Where to next?</Text>
                </View>
            </TouchableOpacity>

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
                <QuickAction icon={Home} label="Home" onPress={() => handleQuickAction('Home')} />
                <QuickAction icon={Briefcase} label="Work" onPress={() => handleQuickAction('Work')} />
                <QuickAction icon={Clock} label="History" onPress={() => router.push('/(client)/trips')} />
            </View>

            {/* Recent Trips Section */}
            {recentTrips.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Trips</Text>
                    </View>
                    <View style={{ gap: 12 }}>
                        {recentTrips.map(renderRecentTrip)}
                    </View>
                </View>
            )}

            {/* Recommended Drivers Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Routes</Text>
                    <TouchableOpacity onPress={() => router.push('/(client)/search')}>
                        <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                    </TouchableOpacity>
                </View>

                {recommendedTrips.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.driversScroll}>
                        {recommendedTrips.map((info) => {
                            const car = cars.find(c => c.id === info.routeId?.carId);
                            return (
                                <TouchableOpacity
                                    key={info.id}
                                    style={[styles.driverCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                    onPress={() => router.push({
                                        pathname: '/(client)/request-trip',
                                        params: { driverTripId: info.id }
                                    })}
                                >
                                    <View style={[styles.driverAvatar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                        <User size={24} color={theme.icon} />
                                    </View>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={[styles.driverName, { color: theme.text }]} numberOfLines={1}>{info.driverId?.fullName || 'Driver'}</Text>
                                        <Text style={{ fontSize: 10, color: theme.icon }}>{car?.model || 'Car'}</Text>
                                    </View>

                                    <View style={[styles.ratingContainer, { marginTop: 4 }]}>
                                        <Star size={12} color="#EBAC00" fill="#EBAC00" />
                                        <Text style={[styles.ratingValue, { color: theme.text }]}>5.0</Text>
                                    </View>
                                    <View style={[styles.priceBadge, { backgroundColor: theme.primary + '10', marginTop: 8 }]}>
                                        <Text style={[styles.driverPrice, { color: theme.primary }]}>${info.routeId?.price}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <View style={[styles.emptyStateBanner, { backgroundColor: theme.surface }]}>
                        <Text style={{ color: theme.icon }}>No active routes available right now.</Text>
                    </View>
                )}
            </View>
            <View style={{ height: 100 }} />
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
        paddingTop: 60,
        paddingBottom: 20,
    },
    welcomeText: {
        fontSize: 16,
        marginBottom: 4,
        fontWeight: '600',
        opacity: 0.7,
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
    searchBarContainer: {
        paddingHorizontal: 24,
        marginBottom: 28,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 24,
        borderWidth: 1,
        gap: 14,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.06)',
        elevation: 4,
    },
    searchPlaceholder: {
        fontSize: 16,
        fontWeight: '600',
    },
    quickActionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 16,
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
    driversScroll: {
        paddingHorizontal: 24,
        gap: 16,
    },
    driverCard: {
        width: 150,
        padding: 16,
        paddingVertical: 20,
        borderRadius: 26,
        borderWidth: 1,
        alignItems: 'center',
        boxShadow: '0px 4px 12px rgba(0,0,0,0.04)',
        elevation: 3,
    },
    driverAvatar: {
        width: 60,
        height: 60,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 10,
        boxShadow: '0px 4px 8px rgba(0,0,0,0.08)',
    },
    driverName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
        marginBottom: 10,
        backgroundColor: 'rgba(255, 204, 0, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    ratingValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    driverRoute: {
        fontSize: 12,
        marginBottom: 12,
        textAlign: 'center',
    },
    priceBadge: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
    },
    driverPrice: {
        fontSize: 14,
        fontWeight: '800',
    },
    emptyStateBanner: {
        marginHorizontal: 24,
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        borderStyle: 'dashed',
    }
});
