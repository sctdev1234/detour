import { useUIStore } from '@/store/useUIStore';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Maximize2, X, Search, MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View, Modal, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import DetourMap from '../../components/Map';
import { Colors } from '../../constants/theme';
import { useAddRoute } from '../../hooks/api/useTripQueries';
import { RouteService } from '../../services/RouteService';
import { LatLng } from '../../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AddClientRouteScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { mutateAsync: addRoute } = useAddRoute();
    const { showToast } = useUIStore();

    const [points, setPoints] = useState<LatLng[]>([]);
    const [timeStart, setTimeStart] = useState('08:00');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [pointAddresses, setPointAddresses] = useState<string[]>([]);
    const [isMapModalVisible, setIsMapModalVisible] = useState(false);

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<{ label: string; latitude: number; longitude: number }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchFocusPoint, setSearchFocusPoint] = useState<LatLng | null>(null);

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.trim().length > 2) {
            setIsSearching(true);
            try {
                const results = await RouteService.geocode(text);
                setSuggestions(results);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSuggestions([]);
        }
    };

    const handleSelectSuggestion = (suggestion: { label: string; latitude: number; longitude: number }) => {
        const newPoint: LatLng = {
            latitude: suggestion.latitude,
            longitude: suggestion.longitude
        };
        const newPoints = [...points, newPoint];
        handlePointsChange(newPoints);
        setSearchFocusPoint(newPoint);
        setSearchQuery('');
        setSuggestions([]);
    };

    useEffect(() => {
        const initRoute = async () => {
            if (params.fromCurrent === 'true' && params.destLat && params.destLng) {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                let location;
                try {
                    location = await Location.getCurrentPositionAsync({});
                } catch (err) {
                    location = await Location.getLastKnownPositionAsync({});
                    if (!location) {
                        console.warn('Location unavailable in add-route:', err);
                        return;
                    }
                }
                const startPoint: LatLng = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                };

                const endPoint: LatLng = {
                    latitude: parseFloat(params.destLat as string),
                    longitude: parseFloat(params.destLng as string)
                };

                const newPoints = [startPoint, endPoint];
                setPoints(newPoints);

                // Get addresses
                try {
                    const startAddr = await RouteService.reverseGeocode(startPoint.latitude, startPoint.longitude);
                    setPointAddresses([startAddr, params.destAddress as string || 'Destination']);
                } catch (e) {
                    setPointAddresses(['Current Location', params.destAddress as string || 'Destination']);
                }
            }
        };
        initRoute();
    }, [params]);

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handlePointsChange = async (newPoints: LatLng[]) => {
        setPoints(newPoints);
        if (newPoints.length > 0) {
            try {
                const addresses = await Promise.all(
                    newPoints.map(p => RouteService.reverseGeocode(p.latitude, p.longitude))
                );
                setPointAddresses(addresses);
            } catch (error) {
                console.error('Failed to fetch addresses', error);
            }
        } else {
            setPointAddresses([]);
        }
    };

    const [price, setPrice] = useState('');

    const handleSave = async () => {
        if (points.length < 2) {
            showToast('Please select at least Pickup and Dropoff points', 'warning');
            return;
        }
        if (selectedDays.length === 0) {
            showToast('Please select at least one day', 'warning');
            return;
        }
        if (!price || isNaN(parseFloat(price))) {
            showToast('Please enter a valid price', 'warning');
            return;
        }

        try {
            const newRoute = await addRoute({
                role: 'client',
                startPoint: { ...points[0], address: pointAddresses[0] || 'Unknown Location' },
                endPoint: { ...points[points.length - 1], address: pointAddresses[points.length - 1] || 'Unknown Location' },
                waypoints: points.slice(1, -1).map((p, i) => ({ ...p, address: pointAddresses[i + 1] || 'Unknown Waypoint' })),
                timeStart,
                timeArrival: '', // Not needed for client
                days: selectedDays,
                price: parseFloat(price),
                priceType: 'fix',
                status: 'pending',
            });
            showToast('Route created! Waiting for driver offers...', 'success');
            router.replace('/(client)/requests');
        } catch (error: any) {
            console.error(error);
            showToast(error.response?.data?.msg || 'Failed to create route', 'error');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 20, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Request a Ride</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Select Points</Text>
                        <TouchableOpacity
                            style={[styles.mapContainer, { borderColor: theme.border }]}
                            onPress={() => setIsMapModalVisible(true)}
                            activeOpacity={0.9}
                        >
                            <DetourMap
                                mode="picker"
                                initialPoints={points}
                                readOnly={true}
                                theme={theme}
                                interactive={false}
                            />
                            <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.mapOverlay}>
                                <Maximize2 size={16} color={theme.primary} />
                                <Text style={[styles.overlayText, { color: theme.text }]}>
                                    {points.length === 0 ? 'Tap to Set Route (Full Screen)' : 'Tap to Edit Route (Full Screen)'}
                                </Text>
                            </BlurView>
                        </TouchableOpacity>

                        {points.map((p, i) => (
                            <View key={i} style={styles.pointRow}>
                                <Text style={[styles.pointText, { color: theme.text }]}>
                                    {i === 0 ? 'Start: ' : i === points.length - 1 ? 'End: ' : `Way: `}
                                    {pointAddresses[i] || 'Selecting...'}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Details</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, marginBottom: 12 }]}
                            value={timeStart}
                            onChangeText={setTimeStart}
                            placeholder="Departure Time (e.g. 08:30)"
                            placeholderTextColor={theme.text + '80'}
                        />
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                            value={price}
                            onChangeText={setPrice}
                            placeholder="Proposed Price (MAD)"
                            keyboardType="numeric"
                            placeholderTextColor={theme.text + '80'}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Schedule</Text>
                        <View style={styles.daysGrid}>
                            {DAYS.map(day => (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayItem,
                                        { backgroundColor: selectedDays.includes(day) ? theme.primary : theme.surface }
                                    ]}
                                    onPress={() => toggleDay(day)}
                                >
                                    <Text style={{ color: selectedDays.includes(day) ? '#fff' : theme.text }}>{day}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.primary }]}
                        onPress={handleSave}
                    >
                        <Check size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>Create Request</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Full Screen Map Picker Modal */}
            <Modal
                visible={isMapModalVisible}
                animationType="slide"
                onRequestClose={() => setIsMapModalVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                        <TouchableOpacity 
                            onPress={() => setIsMapModalVisible(false)}
                            style={styles.modalCloseBtn}
                        >
                            <X size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Select Route Points</Text>
                        <TouchableOpacity 
                            onPress={() => handlePointsChange([])}
                            style={styles.modalClearBtn}
                        >
                            <Text style={{ color: '#ef4444', fontWeight: '700' }}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1, position: 'relative' }}>
                        <DetourMap 
                            mode="picker" 
                            initialPoints={points}
                            onPointsChange={handlePointsChange} 
                            theme={theme} 
                            fullScreen
                            height="100%"
                            boundsPoints={searchFocusPoint ? [searchFocusPoint] : undefined}
                            onMapPress={() => setSearchFocusPoint(null)}
                        />
                        {/* Modern Floating Search Bar */}
                        <View style={styles.searchContainer}>
                            <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <Search size={20} color={theme.icon} style={styles.searchIcon} />
                                <TextInput
                                    style={[styles.searchInput, { color: theme.text }]}
                                    placeholder="Search places (e.g. Maarif, Casablanca)"
                                    placeholderTextColor={theme.textSecondary + '80'}
                                    value={searchQuery}
                                    onChangeText={handleSearch}
                                    autoCorrect={false}
                                />
                                {isSearching ? (
                                    <ActivityIndicator size="small" color={theme.primary} style={styles.searchLoader} />
                                ) : searchQuery.length > 0 ? (
                                    <TouchableOpacity 
                                        onPress={() => {
                                            setSearchQuery('');
                                            setSuggestions([]);
                                        }}
                                        style={styles.searchClearBtn}
                                    >
                                        <X size={18} color={theme.icon} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            {suggestions.length > 0 && (
                                <View style={[styles.suggestionsContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                    <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                                        {suggestions.map((item, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                                                onPress={() => handleSelectSuggestion(item)}
                                            >
                                                <MapPin size={16} color={theme.primary} style={styles.suggestionIcon} />
                                                <Text style={[styles.suggestionText, { color: theme.text }]} numberOfLines={2}>
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={[styles.modalFooter, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                        <TouchableOpacity
                            onPress={() => setIsMapModalVisible(false)}
                            style={[styles.modalConfirmBtn, { backgroundColor: theme.primary }]}
                            activeOpacity={0.8}
                        >
                            <Check size={20} color="#fff" />
                            <Text style={styles.modalConfirmText}>
                                {points.length < 2 
                                    ? `Select Points (${points.length}/2+)` 
                                    : `Confirm Route (${points.length} Points)`
                                }
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '800' },
    content: { padding: 24, gap: 32 },
    section: { gap: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    mapContainer: { height: 300, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
    pointRow: { padding: 12, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12 },
    pointText: { fontSize: 14, fontWeight: '600' },
    input: { height: 56, borderRadius: 18, borderWidth: 1, paddingHorizontal: 18, fontSize: 16 },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayItem: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
    saveButton: { height: 64, borderRadius: 32, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 },
    saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    // Overlay styles
    mapOverlay: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
        overflow: 'hidden',
    },
    overlayText: {
        fontWeight: '600',
        fontSize: 14,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    modalClearBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    modalFooter: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: 1,
    },
    modalConfirmBtn: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    modalConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    searchContainer: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 999,
        elevation: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 54,
        borderRadius: 27,
        borderWidth: 1,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        height: '100%',
        paddingVertical: 0,
    },
    searchLoader: {
        marginLeft: 8,
    },
    searchClearBtn: {
        padding: 4,
        marginLeft: 8,
    },
    suggestionsContainer: {
        marginTop: 8,
        borderRadius: 18,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    suggestionIcon: {
        marginRight: 12,
    },
    suggestionText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    }
});
