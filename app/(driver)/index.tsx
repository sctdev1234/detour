import { Bell, Car, ChevronRight, Clock, MapPin, Star, TrendingUp, User } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
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
    const pendingRequestsCount = useClientRequestStore((state) =>
        state.requests.filter(r => r.status === 'pending').length
    );
    const getAverageRating = useRatingStore((state) => state.getAverageRating);
    const avgRating = getAverageRating(user?.uid || '');

    const stats = [
        { label: 'Weekly Profit', value: '$450.00', icon: TrendingUp, color: '#4CD964' },
        { label: 'Total KM', value: '1,240', icon: MapPin, color: theme.primary },
        { label: 'Trips Done', value: '24', icon: Car, color: theme.secondary },
    ];

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.welcomeText, { color: theme.icon }]}>Welcome back,</Text>
                    <Text style={[styles.nameText, { color: theme.text }]}>{user?.displayName || 'Driver'}</Text>
                    {avgRating > 0 && (
                        <View style={styles.ratingBadge}>
                            <Star size={14} color="#FFCC00" fill="#FFCC00" />
                            <Text style={[styles.ratingText, { color: theme.icon }]}>{avgRating} Rating</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.profileButton, { backgroundColor: theme.surface }]}
                    onPress={() => router.push('/(driver)/profile')}
                >
                    <User color={theme.primary} size={24} />
                </TouchableOpacity>
            </View>

            {pendingRequestsCount > 0 && (
                <TouchableOpacity
                    style={[styles.notificationBanner, { backgroundColor: theme.primary }]}
                    onPress={() => router.push('/(driver)/requests')}
                >
                    <Bell size={20} color="#fff" />
                    <Text style={styles.notificationText}>You have {pendingRequestsCount} new trip requests!</Text>
                    <ChevronRight size={20} color="#fff" />
                </TouchableOpacity>
            )}

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

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Trajets</Text>
                    <TouchableOpacity onPress={() => router.push('/(driver)/routes')}>
                        <Text style={{ color: theme.primary }}>View All</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.tripCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.tripInfo}>
                        <View style={styles.timeContainer}>
                            <Clock size={16} color={theme.icon} />
                            <Text style={[styles.timeText, { color: theme.icon }]}>08:00 AM</Text>
                        </View>
                        <Text style={[styles.routeText, { color: theme.text }]}>Casablanca → Rabat</Text>
                        <Text style={[styles.carText, { color: theme.icon }]}>BMW M4 • Black</Text>
                    </View>
                    <ChevronRight size={20} color={theme.border} />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.primary }]}
                        onPress={() => router.push('/(driver)/add-trip')}
                    >
                        <MapPin size={24} color="#fff" />
                        <Text style={styles.actionText}>Add Trajet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.secondary }]}
                        onPress={() => router.push('/(driver)/cars')}
                    >
                        <Car size={24} color="#fff" />
                        <Text style={styles.actionText}>Manage Cars</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingTop: 32,
    },
    welcomeText: {
        fontSize: 16,
        marginBottom: 4,
    },
    nameText: {
        fontSize: 24,
        fontWeight: '700',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
    },
    profileButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBanner: {
        marginHorizontal: 24,
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    notificationText: {
        color: '#fff',
        fontWeight: '700',
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
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
    tripCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    tripInfo: {
        flex: 1,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    timeText: {
        fontSize: 14,
    },
    routeText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    carText: {
        fontSize: 14,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 16,
    },
    actionButton: {
        flex: 1,
        height: 100,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
