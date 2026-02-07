import { useAuthStore } from '@/store/useAuthStore';
import { useCarStore } from '@/store/useCarStore';
import { useTripStore } from '@/store/useTripStore';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Clock, DollarSign, Filter, Search, Star, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import MapPicker from '../../components/MapPicker';
import { Colors } from '../../constants/theme';
import { Trip } from '../../store/useTripStore';

export default function ClientSearchScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { searchResults, searchTrips, isLoading } = useTripStore();
    const cars = useCarStore((state) => state.cars);

    const [points, setPoints] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [filterVisible, setFilterVisible] = useState(false);

    // Filter Stats
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [sortBy, setSortBy] = useState<'price' | 'time'>('time');

    const handleSearch = async () => {
        if (points.length < 2) return;
        try {
            await searchTrips({
                pickup: points[0],
                destination: points[1]
            });
            setShowResults(true);
        } catch (error) {
            console.error('Search failed', error);
        }
    };

    // Filter Logic
    const filteredTrips = searchResults
        .filter(trip => {
            if (maxPrice && parseFloat(maxPrice) > 0) {
                return trip.price <= parseFloat(maxPrice);
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'price') return (a.price || 0) - (b.price || 0);
            return (a.timeStart || '').localeCompare(b.timeStart || '');
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
                        {item.profilePhoto ? (
                            <Text style={[styles.avatarText, { color: theme.primary }]}>{item.driverName?.charAt(0) || 'D'}</Text>
                        ) : (
                            <Text style={[styles.avatarText, { color: theme.primary }]}>{item.driverName?.charAt(0) || 'D'}</Text>
                        )}
                    </View>
                    <View style={styles.driverDetails}>
                        <Text style={[styles.driverName, { color: theme.text }]}>{item.driverName || 'Driver'}</Text>
                        <Text style={[styles.carInfo, { color: theme.icon }]}>{car ? `${car.marque} ${car.model}` : 'Verified Driver'}</Text>
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
                        <Text style={[styles.viewText, { color: theme.primary }]}>View Details</Text>
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
                        <Text style={{ fontSize: 16, color: theme.icon, marginTop: 4 }}>Where are we going today?</Text>
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

                        {/* Saved Places Quick Access */}
                        {points.length < 2 && useAuthStore.getState().user?.savedPlaces && (useAuthStore.getState().user?.savedPlaces?.length ?? 0) > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 12, marginLeft: 4 }}>Saved Places</Text>
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    data={useAuthStore.getState().user?.savedPlaces}
                                    keyExtractor={(item, index) => item._id || index.toString()}
                                    contentContainerStyle={{ gap: 12, paddingRight: 20 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.savedPlaceChip, { backgroundColor: theme.background, borderColor: theme.border }]}
                                            onPress={() => {
                                                const newPoint = { latitude: item.latitude, longitude: item.longitude };
                                                if (points.length === 0) setPoints([newPoint]);
                                                else if (points.length === 1) setPoints([...points, newPoint]);
                                            }}
                                        >
                                            <View style={[styles.savedIcon, { backgroundColor: theme.primary + '20' }]}>
                                                <Star size={12} color={theme.primary} fill={theme.primary} />
                                            </View>
                                            <Text style={[styles.savedPlaceText, { color: theme.text }]}>{item.label}</Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        )}

                        <View style={styles.routeSummary}>
                            <View style={styles.routeDotLine}>
                                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                                <View style={[styles.line, { backgroundColor: theme.border }]} />
                                <View style={[styles.square, { borderColor: theme.text }]} />
                            </View>
                            <View style={styles.routeTexts}>
                                {/* Pickup Row */}
                                <View style={[styles.locationRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.routeLabel, { color: points.length > 0 ? theme.text : theme.icon }]}>
                                            {points.length > 0 ? (points[0].latitude === 33.5731 ? 'Casablanca, Morocco' : 'Selected Pickup') : 'Select Pickup Point'}
                                        </Text>
                                        {points.length > 0 && (
                                            <Text style={[styles.routeSubtext, { color: theme.icon }]}>
                                                {points[0].latitude.toFixed(4)}, {points[0].longitude.toFixed(4)}
                                            </Text>
                                        )}
                                    </View>
                                    {points.length > 0 && (
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => {
                                                    useAuthStore.getState().addSavedPlace({
                                                        label: `Saved Pickup ${new Date().toLocaleDateString()}`,
                                                        address: `Lat: ${points[0].latitude.toFixed(2)}, Lng: ${points[0].longitude.toFixed(2)}`,
                                                        latitude: points[0].latitude,
                                                        longitude: points[0].longitude,
                                                        icon: 'map-pin'
                                                    }).then(() => alert('Pickup saved!'));
                                                }}
                                            >
                                                <Star size={18} color={theme.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, { backgroundColor: '#fee2e2' }]}
                                                onPress={() => {
                                                    const newPoints = points.filter((_, i) => i !== 0);
                                                    setPoints(newPoints);
                                                }}
                                            >
                                                <X size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* Destination Row */}
                                <View style={[styles.locationRow, { marginTop: 12 }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.routeLabel, { color: points.length > 1 ? theme.text : theme.icon }]}>
                                            {points.length > 1 ? (points[1].latitude === 34.0209 ? 'Rabat, Morocco' : 'Selected Destination') : 'Select Destination'}
                                        </Text>
                                        {points.length > 1 && (
                                            <Text style={[styles.routeSubtext, { color: theme.icon }]}>
                                                {points[1].latitude.toFixed(4)}, {points[1].longitude.toFixed(4)}
                                            </Text>
                                        )}
                                    </View>
                                    {points.length > 1 && (
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => {
                                                    useAuthStore.getState().addSavedPlace({
                                                        label: `Saved Destination ${new Date().toLocaleDateString()}`,
                                                        address: `Lat: ${points[1].latitude.toFixed(2)}, Lng: ${points[1].longitude.toFixed(2)}`,
                                                        latitude: points[1].latitude,
                                                        longitude: points[1].longitude,
                                                        icon: 'map-pin'
                                                    }).then(() => alert('Destination saved!'));
                                                }}
                                            >
                                                <Star size={18} color={theme.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, { backgroundColor: '#fee2e2' }]}
                                                onPress={() => {
                                                    const newPoints = points.filter((_, i) => i !== 1);
                                                    setPoints(newPoints);
                                                }}
                                            >
                                                <X size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.searchButton,
                                { backgroundColor: theme.primary, opacity: (points.length < 2 || isLoading) ? 0.6 : 1 }
                            ]}
                            onPress={handleSearch}
                            disabled={points.length < 2 || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Search size={20} color="#fff" />
                                    <Text style={styles.searchButtonText}>Search Available Trips</Text>
                                </>
                            )}
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
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    mapWrapper: {
        flex: 1,
        position: 'relative',
        borderRadius: 30,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: -30,
        zIndex: 1,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: '#f5f5f5', // fallback
        elevation: 5,
        boxShadow: '0px 10px 30px rgba(0,0,0,0.1)',
    },
    instructionBadge: {
        position: 'absolute',
        top: 20,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        elevation: 4,
        boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
        zIndex: 10,
    },
    bottomPanel: {
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        zIndex: 2,
        elevation: 10,
        boxShadow: '0px -5px 20px rgba(0,0,0,0.05)',
    },
    routeSummary: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    routeDotLine: {
        alignItems: 'center',
        marginRight: 16,
        paddingTop: 6,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    line: {
        width: 2,
        height: 30,
        marginVertical: 4,
        borderRadius: 1,
    },
    square: {
        width: 12,
        height: 12,
        borderWidth: 2,
        borderRadius: 3,
    },
    routeTexts: {
        flex: 1,
        justifyContent: 'space-between',
        height: 60,
    },
    routeLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    searchButton: {
        height: 56,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
        elevation: 4,
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
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        marginRight: 8,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
    },
    filterButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
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
        borderWidth: 1,
        borderColor: '#fff',
    },
    resultsList: {
        padding: 24,
        gap: 16,
        paddingBottom: 40,
    },
    driverCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.02)',
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 20,
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
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    carInfo: {
        fontSize: 14,
    },
    priceContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    priceText: {
        fontSize: 20,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        marginBottom: 12,
        opacity: 0.5,
    },
    tripMetas: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    metaText: {
        fontSize: 14,
        fontWeight: '600',
    },
    metaAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewText: {
        fontSize: 14,
        fontWeight: '600',
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
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 30,
        minHeight: 450,
        boxShadow: '0px -10px 40px rgba(0,0,0,0.1)',
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
    },
    filterSection: {
        marginBottom: 28,
        gap: 12,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 20,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        height: '100%',
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
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    sortText: {
        fontSize: 14,
        fontWeight: '700',
    },
    applyButton: {
        marginTop: 12,
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    routeSubtext: {
        fontSize: 12,
        marginTop: 4,
    },
    deletePointButton: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
    },
    savedPlaceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
    },
    savedIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    savedPlaceText: {
        fontSize: 13,
        fontWeight: '600',
    },
    locationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    actionButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 16,
    }
});

