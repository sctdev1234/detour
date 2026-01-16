import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import MapPicker from '../../components/MapPicker';
import { useTripStore, Trip } from '../../store/useTripStore';
import { useCarStore } from '../../store/useCarStore';
import { Search, MapPin, Clock, DollarSign, ChevronRight, Filter } from 'lucide-react-native';

export default function ClientSearchScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const allDriverTrips = useTripStore((state) => state.trips);
    const cars = useCarStore((state) => state.cars);

    const [points, setPoints] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    const handleSearch = () => {
        if (points.length < 2) return;
        setShowResults(true);
    };

    const renderDriverTrip = ({ item }: { item: Trip }) => {
        const car = cars.find(c => c.id === item.carId);
        return (
            <TouchableOpacity
                style={[styles.driverCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => router.push({
                    pathname: '/(client)/request-trip',
                    params: { driverTripId: item.id }
                })}
            >
                <View style={styles.driverInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.avatarText, { color: theme.primary }]}>D</Text>
                    </View>
                    <View style={styles.driverDetails}>
                        <Text style={[styles.driverName, { color: theme.text }]}>Driver Name</Text>
                        <Text style={[styles.carInfo, { color: theme.icon }]}>{car ? `${car.marque} ${car.model}` : 'Standard Car'}</Text>
                    </View>
                    <View style={styles.priceTag}>
                        <Text style={[styles.priceText, { color: theme.primary }]}>
                            {item.priceType === 'fix' ? `$${item.price}` : `$${item.price}/km`}
                        </Text>
                    </View>
                </View>

                <View style={styles.tripMetas}>
                    <View style={styles.metaItem}>
                        <Clock size={14} color={theme.icon} />
                        <Text style={[styles.metaText, { color: theme.icon }]}>{item.timeStart}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <MapPin size={14} color={theme.icon} />
                        <Text style={[styles.metaText, { color: theme.icon }]}>Approx. Route</Text>
                    </View>
                </View>

                <ChevronRight size={20} color={theme.border} style={styles.chevron} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {!showResults ? (
                <ScrollView contentContainerStyle={styles.searchContainer}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Find a Ride</Text>
                        <Text style={[styles.subtitle, { color: theme.icon }]}>Select your route to see available drivers</Text>
                    </View>

                    <View style={styles.mapSection}>
                        <MapPicker onPointsChange={setPoints} theme={theme} />
                    </View>

                    <TouchableOpacity
                        style={[styles.searchButton, { backgroundColor: theme.primary, opacity: points.length < 2 ? 0.6 : 1 }]}
                        onPress={handleSearch}
                        disabled={points.length < 2}
                    >
                        <Search size={22} color="#fff" />
                        <Text style={styles.searchButtonText}>Search Available Trips</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <View style={styles.resultsContainer}>
                    <View style={styles.resultsHeader}>
                        <TouchableOpacity onPress={() => setShowResults(false)} style={styles.backLink}>
                            <Text style={{ color: theme.primary }}>← Back to Map</Text>
                        </TouchableOpacity>
                        <Text style={[styles.resultsTitle, { color: theme.text }]}>Available Drivers</Text>
                        <TouchableOpacity style={styles.filterButton}>
                            <Filter size={20} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={allDriverTrips} // Simplification: showing all as "nearby"
                        keyExtractor={(item) => item.id}
                        renderItem={renderDriverTrip}
                        contentContainerStyle={styles.resultsList}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Search size={64} color={theme.border} />
                                <Text style={[styles.emptyText, { color: theme.icon }]}>No drivers found for this route</Text>
                            </View>
                        }
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        padding: 24,
        gap: 24,
    },
    header: {
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
    },
    mapSection: {
        height: 480,
    },
    searchButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    resultsContainer: {
        flex: 1,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingTop: 32,
    },
    backLink: {
        paddingVertical: 4,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    filterButton: {
        padding: 8,
    },
    resultsList: {
        padding: 24,
        gap: 16,
    },
    driverCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 12,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
    },
    driverDetails: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontWeight: '600',
    },
    carInfo: {
        fontSize: 12,
    },
    priceTag: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#0066FF10',
    },
    priceText: {
        fontSize: 16,
        fontWeight: '700',
    },
    tripMetas: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 12,
    },
    chevron: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: 4, // adjustment due to top: 50%
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
    },
});
