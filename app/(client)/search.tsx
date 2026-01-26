import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Clock, DollarSign, Filter, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import MapPicker from '../../components/MapPicker';
import { Colors } from '../../constants/theme';
import { useCarStore } from '../../store/useCarStore';
import { Trip, useTripStore } from '../../store/useTripStore';

export default function ClientSearchScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const allDriverTrips = useTripStore((state) => state.trips);
    const cars = useCarStore((state) => state.cars);

    const [points, setPoints] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [filterVisible, setFilterVisible] = useState(false);

    // Filter Stats
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [sortBy, setSortBy] = useState<'price' | 'time'>('time');

    const handleSearch = () => {
        if (points.length < 2) return;
        setShowResults(true);
    };

    // Filter Logic
    const filteredTrips = allDriverTrips
        .filter(trip => {
            if (maxPrice && parseFloat(maxPrice) > 0) {
                return trip.price <= parseFloat(maxPrice);
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'price') return a.price - b.price;
            // Simple string comparison for time (e.g. "08:00") works for same-day
            return a.timeStart.localeCompare(b.timeStart);
        });

    const renderDriverTrip = ({ item }: { item: Trip }) => {
        const car = cars.find(c => c.id === item.carId);
        return (
            <TouchableOpacity
                style={[styles.driverCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => router.push({
                    pathname: '/(client)/request-trip',
                    params: { driverTripId: item.id }
                })}
                activeOpacity={0.7}
            >
                <View style={styles.driverInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.primary + '10' }]}>
                        <Text style={[styles.avatarText, { color: theme.primary }]}>D</Text>
                    </View>
                    <View style={styles.driverDetails}>
                        <Text style={[styles.driverName, { color: theme.text }]}>Driver Name</Text>
                        <Text style={[styles.carInfo, { color: theme.icon }]}>{car ? `${car.marque} ${car.model}` : 'Standard Car'}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                        <Text style={[styles.priceText, { color: theme.primary }]}>
                            {item.priceType === 'fix' ? `$${item.price}` : `$${item.price}/km`}
                        </Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.tripMetas}>
                    <View style={styles.metaItem}>
                        <Clock size={16} color={theme.icon} />
                        <Text style={[styles.metaText, { color: theme.text }]}>{item.timeStart}</Text>
                    </View>
                    <View style={styles.metaAction}>
                        <Text style={[styles.viewText, { color: theme.primary }]}>View</Text>
                        <ChevronRight size={16} color={theme.primary} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {!showResults ? (
                <View style={styles.flexContainer}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Find a Ride</Text>
                    </View>

                    <View style={styles.mapWrapper}>
                        <MapPicker onPointsChange={setPoints} theme={theme} />

                        {points.length === 0 && (
                            <View style={[styles.instructionBadge, { backgroundColor: theme.surface }]}>
                                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Tap map to set Pickup</Text>
                            </View>
                        )}
                        {points.length === 1 && (
                            <View style={[styles.instructionBadge, { backgroundColor: theme.surface }]}>
                                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Tap map to set Destination</Text>
                            </View>
                        )}
                    </View>

                    <View style={[styles.bottomPanel, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                        <View style={styles.routeSummary}>
                            <View style={styles.routeDotLine}>
                                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                                <View style={[styles.line, { backgroundColor: theme.border }]} />
                                <View style={[styles.square, { borderColor: theme.text }]} />
                            </View>
                            <View style={styles.routeTexts}>
                                <Text style={[styles.routeLabel, { color: theme.text }]}>
                                    {points.length > 0 ? 'Pickup Set' : 'Select Pickup Point'}
                                </Text>
                                <View style={{ height: 24 }} />
                                <Text style={[styles.routeLabel, { color: theme.text }]}>
                                    {points.length > 1 ? 'Destination Set' : 'Select Destination'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.searchButton,
                                { backgroundColor: theme.primary, opacity: points.length < 2 ? 0.5 : 1 }
                            ]}
                            onPress={handleSearch}
                            disabled={points.length < 2}
                        >
                            <Search size={20} color="#fff" />
                            <Text style={styles.searchButtonText}>Search Available Trips</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.resultsContainer}>
                    <View style={[styles.resultsHeader, { borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={() => setShowResults(false)} style={styles.backButton}>
                            <ArrowLeft size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.resultsTitle, { color: theme.text }]}>Available Rides</Text>
                        <TouchableOpacity
                            style={[styles.filterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                            onPress={() => setFilterVisible(true)}
                        >
                            <Filter size={20} color={theme.text} />
                            {(maxPrice || sortBy !== 'time') && <View style={styles.filterDot} />}
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={filteredTrips}
                        keyExtractor={(item) => item.id}
                        renderItem={renderDriverTrip}
                        contentContainerStyle={styles.resultsList}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Search size={48} color={theme.border} />
                                <Text style={[styles.emptyText, { color: theme.icon }]}>No drivers found matching filters</Text>
                                <TouchableOpacity onPress={() => { setMaxPrice(''); setSortBy('time'); }}>
                                    <Text style={{ color: theme.primary, marginTop: 12, fontWeight: '600' }}>Clear Filters</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>
            )}

            {/* Filter Modal */}
            <Modal visible={filterVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackdrop} onPress={() => setFilterVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Filter & Sort</Text>
                            <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                <X size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={[styles.filterLabel, { color: theme.text }]}>Max Price</Text>
                            <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <DollarSign size={20} color={theme.icon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={maxPrice}
                                    onChangeText={setMaxPrice}
                                    placeholder="Any price"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={[styles.filterLabel, { color: theme.text }]}>Sort By</Text>
                            <View style={styles.sortOptions}>
                                <TouchableOpacity
                                    style={[
                                        styles.sortOption,
                                        {
                                            backgroundColor: sortBy === 'time' ? theme.primary : theme.surface,
                                            borderColor: sortBy === 'time' ? theme.primary : theme.border
                                        }
                                    ]}
                                    onPress={() => setSortBy('time')}
                                >
                                    <Clock size={16} color={sortBy === 'time' ? '#fff' : theme.text} />
                                    <Text style={[styles.sortText, { color: sortBy === 'time' ? '#fff' : theme.text }]}>Earlier Time</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.sortOption,
                                        {
                                            backgroundColor: sortBy === 'price' ? theme.primary : theme.surface,
                                            borderColor: sortBy === 'price' ? theme.primary : theme.border
                                        }
                                    ]}
                                    onPress={() => setSortBy('price')}
                                >
                                    <DollarSign size={16} color={sortBy === 'price' ? '#fff' : theme.text} />
                                    <Text style={[styles.sortText, { color: sortBy === 'price' ? '#fff' : theme.text }]}>Lowest Price</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.applyButton, { backgroundColor: theme.primary }]}
                            onPress={() => setFilterVisible(false)}
                        >
                            <Text style={styles.applyButtonText}>Show {filteredTrips.length} Results</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flexContainer: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
    },
    mapWrapper: {
        flex: 1,
        position: 'relative',
    },
    instructionBadge: {
        position: 'absolute',
        top: 20,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bottomPanel: {
        padding: 24,
        borderTopWidth: 1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20, // Overlap map slightly
    },
    routeSummary: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    routeDotLine: {
        alignItems: 'center',
        marginRight: 16,
        paddingTop: 4,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    line: {
        width: 2,
        height: 24,
        marginVertical: 4,
    },
    square: {
        width: 12,
        height: 12,
        borderWidth: 2,
        borderRadius: 2,
    },
    routeTexts: {
        flex: 1,
    },
    routeLabel: {
        fontSize: 16,
        fontWeight: '600',
        height: 24, // Match dot/square height/spacing
    },
    searchButton: {
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    resultsContainer: {
        flex: 1,
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    filterButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        position: 'relative',
    },
    filterDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        position: 'absolute',
        top: 8,
        right: 8,
    },
    resultsList: {
        padding: 20,
        gap: 16,
    },
    driverCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
    },
    driverDetails: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    carInfo: {
        fontSize: 13,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    priceText: {
        fontSize: 18,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginBottom: 12,
    },
    tripMetas: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    metaAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        flex: 1,
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    filterSection: {
        marginBottom: 24,
        gap: 12,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    sortOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    sortOption: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    sortText: {
        fontSize: 14,
        fontWeight: '600',
    },
    applyButton: {
        marginTop: 24,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
