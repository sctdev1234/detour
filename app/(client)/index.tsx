import { useRouter } from 'expo-router';
import { ChevronRight, MapPin, Search, Star, User } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useRatingStore } from '../../store/useRatingStore';

export default function ClientDashboard() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const getAverageRating = useRatingStore((state) => state.getAverageRating);
    const avgRating = getAverageRating(user?.uid || '');

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.welcomeText, { color: theme.icon }]}>Where to go?</Text>
                    <Text style={[styles.nameText, { color: theme.text }]}>Hello, {user?.displayName || 'User'}</Text>
                    {avgRating > 0 && (
                        <View style={styles.ratingBadge}>
                            <Star size={14} color="#FFCC00" fill="#FFCC00" />
                            <Text style={[styles.ratingText, { color: theme.icon }]}>{avgRating} Rating</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.profileButton, { backgroundColor: theme.surface }]}
                    onPress={() => router.push('/(client)/profile')}
                >
                    <User color={theme.secondary} size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchBarContainer}>
                <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Search size={20} color={theme.icon} />
                    <TextInput
                        placeholder="Search for a destination"
                        placeholderTextColor={theme.icon}
                        style={[styles.searchInput, { color: theme.text }]}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Trips</Text>
                <TouchableOpacity style={[styles.tripCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.tripIcon}>
                        <MapPin size={24} color={theme.primary} />
                    </View>
                    <View style={styles.tripDetails}>
                        <Text style={[styles.tripTitle, { color: theme.text }]}>Work</Text>
                        <Text style={[styles.tripSubtitle, { color: theme.icon }]}>123 Business Ave, Casablanca</Text>
                    </View>
                    <ChevronRight size={20} color={theme.border} />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended Drivers</Text>
                    <TouchableOpacity>
                        <Text style={{ color: theme.primary }}>See All</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.driversScroll}>
                    {[1, 2, 3].map((item) => (
                        <TouchableOpacity key={item} style={[styles.driverCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={[styles.driverAvatar, { backgroundColor: theme.accent + '20' }]}>
                                <Star size={20} color={theme.accent} />
                            </View>
                            <Text style={[styles.driverName, { color: theme.text }]}>John D.</Text>
                            <View style={styles.ratingContainer}>
                                <Star size={12} color="#FFCC00" fill="#FFCC00" />
                                <Text style={[styles.ratingText, { color: theme.text }]}>4.9</Text>
                            </View>
                            <Text style={[styles.driverPrice, { color: theme.primary }]}>$15/day</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
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
        padding: 24,
        paddingTop: 32,
    },
    welcomeText: {
        fontSize: 16,
        marginBottom: 4,
    },
    searchBarContainer: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
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
        marginBottom: 16,
    },
    tripCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    tripIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#0066FF20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    tripDetails: {
        flex: 1,
    },
    tripTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    tripSubtitle: {
        fontSize: 14,
    },
    driversScroll: {
        gap: 16,
    },
    driverCard: {
        width: 140,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    driverAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    driverName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
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
    driverPrice: {
        fontSize: 14,
        fontWeight: '700',
    },
});
