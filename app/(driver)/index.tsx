import { Bell, Car, ChevronRight, DollarSign, MapPin, Power, Star, User } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';

import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientRequestStore } from '../../store/useClientRequestStore';
import { useRatingStore } from '../../store/useRatingStore';

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
    const avgRating = getAverageRating(user?.uid || '');

    const stats = [
        { label: 'Weekly Profit', value: '$450.00', icon: DollarSign, color: '#4CD964' },
        { label: 'Total KM', value: '1,240', icon: MapPin, color: theme.primary },
        { label: 'Trips Done', value: '24', icon: Car, color: theme.secondary },
    ];

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={[styles.welcomeText, { color: theme.icon }]}>Good Morning,</Text>
                        <Text style={[styles.nameText, { color: theme.text }]}>{user?.displayName || 'Driver'}</Text>
                        {avgRating > 0 && (
                            <View style={styles.ratingBadge}>
                                <Star size={14} color="#FFCC00" fill="#FFCC00" />
                                <Text style={[styles.ratingText, { color: theme.icon }]}>{avgRating.toFixed(1)} Rating</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.profileButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => router.push('/(driver)/profile')}
                    >
                        <User color={theme.primary} size={24} />
                    </TouchableOpacity>
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
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Routes</Text>
                    <TouchableOpacity onPress={() => router.push('/(driver)/routes')}>
                        <Text style={[styles.seeAllText, { color: theme.primary }]}>View All</Text>
                    </TouchableOpacity>
                </View>

                {/* Example Card */}
                <TouchableOpacity style={[styles.tripCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.timelineStrip}>
                        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                        <View style={[styles.line, { backgroundColor: theme.border }]} />
                        <View style={[styles.dot, { backgroundColor: theme.secondary }]} />
                    </View>
                    <View style={styles.tripInfo}>
                        <View style={styles.tripHeader}>
                            <Text style={[styles.tripTime, { color: theme.text }]}>08:00 AM</Text>
                            <View style={[styles.priceTag, { backgroundColor: '#4CD96420' }]}>
                                <Text style={{ color: '#4CD964', fontSize: 12, fontWeight: '700' }}>$50</Text>
                            </View>
                        </View>
                        <Text style={[styles.routeLoc, { color: theme.text }]}>Casablanca</Text>
                        <Text style={[styles.routeLoc, { color: theme.text, marginTop: 12 }]}>Rabat</Text>
                        <View style={styles.participantsRow}>
                            <Text style={{ fontSize: 12, color: theme.icon }}>3 Passengers</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.primary }]}
                        onPress={() => router.push('/(driver)/add-trip')}
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
    },
    nameText: {
        fontSize: 28,
        fontWeight: '800',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
        backgroundColor: '#FFCC0015',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    ratingText: {
        fontSize: 12,
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
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusSubtitle: {
        fontSize: 12,
    },
    notificationBanner: {
        marginHorizontal: 24,
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    notifIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        fontSize: 12,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        textAlign: 'center',
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
        fontSize: 20,
        fontWeight: '700',
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    tripCard: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        gap: 16,
    },
    timelineStrip: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    line: {
        width: 2,
        flex: 1,
        marginVertical: 4,
    },
    tripInfo: {
        flex: 1,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    tripTime: {
        fontSize: 18,
        fontWeight: '700',
    },
    priceTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    routeLoc: {
        fontSize: 15,
        fontWeight: '500',
    },
    participantsRow: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    actionButton: {
        flex: 1,
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        gap: 12,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
