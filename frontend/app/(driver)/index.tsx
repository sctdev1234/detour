import { Bell, Car, ChevronRight, DollarSign, MapPin, Power, Star } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';

import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientRequestStore } from '../../store/useClientRequestStore';
import { useRatingStore } from '../../store/useRatingStore';
import { useTripStore } from '../../store/useTripStore';

export default function DriverDashboard() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const [isOnline, setIsOnline] = useState(true);

    const pendingRequestsCount = useClientRequestStore((state) =>
        state.requests.filter(r => r.status === 'pending').length
    );
    const getAverageRating = useRatingStore((state) => state.getAverageRating);
    const avgRating = getAverageRating(user?.id || '');

    // Real Data from TripStore
    const trips = useTripStore((state) => state.trips.filter(t => t.driverId === user?.id || t.driverId === 'me'));

    // Calculate Stats
    const activeRoutes = trips.length; // Assuming all in list are active for now, or filter by status
    const totalDistance = trips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
    // Weekly potential: Sum of (price * days per week)
    const weeklyPotential = trips.reduce((acc, t) => acc + (t.price * t.days.length), 0);

    const stats = [
        { label: 'Weekly Potential', value: `$${weeklyPotential.toFixed(0)}`, icon: DollarSign, color: '#4CD964' },
        { label: 'Total Distance', value: `${totalDistance.toFixed(0)} km`, icon: MapPin, color: theme.primary },
        { label: 'Active Routes', value: `${activeRoutes}`, icon: Car, color: theme.secondary },
    ];

    // Get Today's Routes
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayIndex = new Date().getDay();
    const todayName = daysMap[todayIndex];

    const todaysTrips = trips.filter(t => t.days.includes(todayName));

    // Sort by time
    todaysTrips.sort((a, b) => a.timeStart.localeCompare(b.timeStart));

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={[styles.welcomeText, { color: theme.icon }]}>Good Morning,</Text>
                        <Text style={[styles.nameText, { color: theme.text }]}>{user?.fullName || 'Driver'}</Text>
                        {avgRating > 0 && (
                            <View style={styles.ratingBadge}>
                                <Star size={14} color="#FFCC00" fill="#FFCC00" />
                                <Text style={[styles.ratingText, { color: theme.icon }]}>{avgRating.toFixed(1)} Rating</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Online Toggle */}
                <View style={[styles.statusCard, { backgroundColor: isOnline ? '#22c55e15' : theme.surface, borderColor: isOnline ? '#22c55e' : theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.statusIcon, { backgroundColor: isOnline ? '#22c55e' : theme.icon }]}>
                            <Power size={18} color="#fff" />
                        </View>
                        <View>
                            <Text style={[styles.statusTitle, { color: theme.text }]}>{isOnline ? 'You are Online' : 'You are Offline'}</Text>
                            <Text style={[styles.statusSubtitle, { color: theme.icon }]}>{isOnline ? 'Receiving new requests' : 'Go online to start'}</Text>
                        </View>
                    </View>
                    <Switch
                        value={isOnline}
                        onValueChange={setIsOnline}
                        trackColor={{ false: theme.border, true: '#22c55e' }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {/* Notification Banner */}
            {pendingRequestsCount > 0 && (
                <TouchableOpacity
                    style={[styles.notificationBanner, { backgroundColor: theme.primary }]}
                    onPress={() => router.push('/(driver)/requests')}
                >
                    <View style={styles.notifIcon}>
                        <Bell size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.notificationTitle}>New Requests!</Text>
                        <Text style={styles.notificationText}>You have {pendingRequestsCount} pending requests to review.</Text>
                    </View>
                    <ChevronRight size={20} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Stats Grid */}
            <View style={styles.statsContainer}>
                {stats.map((stat, index) => (
                    <View key={index} style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={[styles.iconCircle, { backgroundColor: stat.color + '20' }]}>
                            <stat.icon size={20} color={stat.color} />
                        </View>
                        <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                        <Text style={[styles.statLabel, { color: theme.icon }]}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            {/* Upcoming Routes */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Routes ({todayName})</Text>
                    <TouchableOpacity onPress={() => router.push('/(driver)/routes')}>
                        <Text style={[styles.seeAllText, { color: theme.primary }]}>View All</Text>
                    </TouchableOpacity>
                </View>

                {todaysTrips.length > 0 ? (
                    todaysTrips.map((trip) => (
                        <TouchableOpacity
                            key={trip.id}
                            style={[styles.tripCard, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 16 }]}
                            onPress={() => router.push('/(driver)/routes')}
                        >
                            <View style={styles.timelineStrip}>
                                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                                <View style={[styles.line, { backgroundColor: theme.border }]} />
                                <View style={[styles.dot, { backgroundColor: theme.secondary }]} />
                            </View>
                            <View style={styles.tripInfo}>
                                <View style={styles.tripHeader}>
                                    <Text style={[styles.tripTime, { color: theme.text }]}>{trip.timeStart}</Text>
                                    <View style={[styles.priceTag, { backgroundColor: '#4CD96420' }]}>
                                        <Text style={{ color: '#4CD964', fontSize: 12, fontWeight: '700' }}>
                                            ${trip.price} {trip.priceType === 'km' ? '/km' : ''}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.routeLoc, { color: theme.text }]}>From: {trip.startPoint.latitude.toFixed(3)}...</Text>
                                <Text style={[styles.routeLoc, { color: theme.text, marginTop: 12 }]}>To: {trip.endPoint.latitude.toFixed(3)}...</Text>
                                <View style={styles.participantsRow}>
                                    <Text style={{ fontSize: 12, color: theme.icon }}>{trip.passengers?.length || 0} Passengers</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={[styles.emptyContainer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                        <Car size={32} color={theme.icon} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>No scheduled routes for today.</Text>
                        <TouchableOpacity onPress={() => router.push('/(driver)/add-route')}>
                            <Text style={{ color: theme.primary, fontWeight: '600', marginTop: 8 }}>+ Add Route</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.primary }]}
                        onPress={() => router.push('/(driver)/add-route')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <MapPin size={24} color="#fff" />
                        </View>
                        <Text style={styles.actionText}>Add Route</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.secondary }]}
                        onPress={() => router.push('/(driver)/cars')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Car size={24} color="#fff" />
                        </View>
                        <Text style={styles.actionText}>My Cars</Text>
                    </TouchableOpacity>
                </View>
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
        padding: 24,
        paddingTop: 60,
        gap: 24,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
        opacity: 0.7,
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
        marginTop: 6,
        backgroundColor: '#FFCC0015',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '700',
    },
    profileButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderRadius: 24,
        borderWidth: 1,
        boxShadow: '0px 4px 10px rgba(0,0,0,0.04)',
    },
    statusIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.7,
    },
    notificationBanner: {
        marginHorizontal: 24,
        padding: 18,
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 32,
        boxShadow: '0px 6px 14px rgba(0,0,0,0.15)',
        elevation: 6,
    },
    notifIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 2,
    },
    notificationText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '500',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 36,
    },
    statCard: {
        flex: 1,
        padding: 18,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        gap: 10,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.03)',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '600',
        opacity: 0.7,
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 36,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '700',
    },
    tripCard: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 28,
        borderWidth: 1,
        gap: 16,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.03)',
    },
    timelineStrip: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    line: {
        width: 2,
        flex: 1,
        marginVertical: 4,
        borderRadius: 1,
        opacity: 0.3,
    },
    tripInfo: {
        flex: 1,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    tripTime: {
        fontSize: 20,
        fontWeight: '800',
    },
    priceTag: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    routeLoc: {
        fontSize: 15,
        fontWeight: '500',
        opacity: 0.9,
    },
    participantsRow: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    actionButton: {
        flex: 1,
        padding: 24,
        borderRadius: 28,
        alignItems: 'center',
        gap: 14,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
        elevation: 4,
    },
    actionIcon: {
        width: 52,
        height: 52,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyContainer: {
        padding: 32,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'center',
    }
});
