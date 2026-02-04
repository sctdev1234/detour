import { useUIStore } from '@/store/useUIStore';
import { useRouter } from 'expo-router';
import { Car, Check, ChevronLeft, Clock, MapPin, Route as RouteIcon } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import MapPicker from '../../components/MapPicker';
import { Colors } from '../../constants/theme';
import { RouteService } from '../../services/RouteService';
import { useCarStore } from '../../store/useCarStore';
import { LatLng, useTripStore } from '../../store/useTripStore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AddTripScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const addTrip = useTripStore((state) => state.addTrip);
    const cars = useCarStore((state) => state.cars);

    const { showToast } = useUIStore();

    const [points, setPoints] = useState<LatLng[]>([]);
    const [timeStart, setTimeStart] = useState('08:00');
    const [timeArrival, setTimeArrival] = useState('09:00');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [price, setPrice] = useState('50');
    const [priceType, setPriceType] = useState<'fix' | 'km'>('fix');
    const [selectedCarId, setSelectedCarId] = useState(cars.find(c => c.isDefault)?.id || cars[0]?.id || '');
    const [routeMetrics, setRouteMetrics] = useState<{ distance: number; duration: number; geometry: string } | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handlePointsChange = async (newPoints: LatLng[]) => {
        setPoints(newPoints);
        if (newPoints.length >= 2) {
            setIsCalculating(true);
            try {
                const start = newPoints[0];
                const end = newPoints[newPoints.length - 1];
                const result = await RouteService.calculateRoute(start, end);

                setRouteMetrics({
                    distance: result.distanceKm,
                    duration: result.durationMinutes,
                    geometry: result.geometry
                });

                if (priceType === 'km' && !price) {
                    setPrice('2');
                }
            } catch (error) {
                console.error('Failed to calculate route', error);
            } finally {
                setIsCalculating(false);
            }
        } else {
            setRouteMetrics(null);
        }
    };

    const handleSave = () => {
        if (points.length < 2) {
            showToast('Please select a Pickup and Dropoff point', 'warning');
            return;
        }
        if (!selectedCarId) {
            showToast('Please select a car for this trip', 'warning');
            return;
        }
        if (selectedDays.length === 0) {
            showToast('Please select at least one day', 'warning');
            return;
        }

        addTrip({
            carId: selectedCarId,
            startPoint: points[0],
            endPoint: points[points.length - 1],
            waypoints: points.slice(1, -1),
            timeStart,
            timeArrival,
            days: selectedDays,
            price: parseFloat(price) || 0,
            priceType,
            status: 'active',
            distanceKm: routeMetrics?.distance,
            estimatedDurationMin: routeMetrics?.duration,
            routeGeometry: routeMetrics?.geometry,
        });

        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surface }]}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>New Route</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Step 1: Map */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.stepBadge, { backgroundColor: theme.primary }]}>
                                <Text style={styles.stepText}>1</Text>
                            </View>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Define Route</Text>
                        </View>

                        <View style={[styles.mapContainer, { borderColor: theme.border }]}>
                            <MapPicker onPointsChange={handlePointsChange} theme={theme} />
                            {points.length === 0 && (
                                <View style={[styles.mapOverlay, { backgroundColor: theme.surface }]}>
                                    <MapPin size={24} color={theme.primary} />
                                    <Text style={[styles.overlayText, { color: theme.text }]}>Tap to set pickup</Text>
                                </View>
                            )}
                        </View>

                        {isCalculating && <Text style={{ color: theme.icon, textAlign: 'center', marginTop: 8 }}>Calculating best route...</Text>}

                        {routeMetrics && (
                            <View style={[styles.metricsCard, { backgroundColor: theme.surface }]}>
                                <View style={styles.metric}>
                                    <RouteIcon size={16} color={theme.primary} />
                                    <Text style={[styles.metricText, { color: theme.text }]}>{routeMetrics.distance} km</Text>
                                </View>
                                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                <View style={styles.metric}>
                                    <Clock size={16} color={theme.secondary} />
                                    <Text style={[styles.metricText, { color: theme.text }]}>{routeMetrics.duration} min</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Step 2: Schedule */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.stepBadge, { backgroundColor: theme.primary }]}>
                                <Text style={styles.stepText}>2</Text>
                            </View>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Schedule</Text>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.icon }]}>Departure</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                    value={timeStart}
                                    onChangeText={setTimeStart}
                                    placeholder="08:00"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.icon }]}>Arrival</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                    value={timeArrival}
                                    onChangeText={setTimeArrival}
                                    placeholder="09:00"
                                />
                            </View>
                        </View>

                        <Text style={[styles.label, { color: theme.icon, marginTop: 16 }]}>Recurring Days</Text>
                        <View style={styles.daysGrid}>
                            {DAYS.map(day => (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayItem,
                                        { backgroundColor: selectedDays.includes(day) ? theme.primary : theme.surface, borderColor: theme.border }
                                    ]}
                                    onPress={() => toggleDay(day)}
                                >
                                    <Text style={[styles.dayText, { color: selectedDays.includes(day) ? '#fff' : theme.text }]}>{day}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Step 3: Car & Price */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.stepBadge, { backgroundColor: theme.primary }]}>
                                <Text style={styles.stepText}>3</Text>
                            </View>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Car & Pricing</Text>
                        </View>

                        <Text style={[styles.label, { color: theme.icon }]}>Vehicle</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carsScroll}>
                            {cars.map(car => (
                                <TouchableOpacity
                                    key={car.id}
                                    style={[
                                        styles.carCard,
                                        { backgroundColor: theme.surface, borderColor: selectedCarId === car.id ? theme.primary : theme.border, borderWidth: selectedCarId === car.id ? 2 : 1 }
                                    ]}
                                    onPress={() => setSelectedCarId(car.id)}
                                >
                                    <Car size={20} color={selectedCarId === car.id ? theme.primary : theme.icon} />
                                    <View>
                                        <Text style={[styles.carName, { color: theme.text }]}>{car.model}</Text>
                                        <Text style={{ fontSize: 10, color: theme.icon }}>{car.marque}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={[styles.row, { marginTop: 16 }]}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: theme.icon }]}>Price</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                    keyboardType="numeric"
                                    value={price}
                                    onChangeText={setPrice}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: theme.icon }]}>Type</Text>
                                <View style={[styles.toggleContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, priceType === 'fix' && { backgroundColor: theme.primary }]}
                                        onPress={() => setPriceType('fix')}
                                    >
                                        <Text style={[styles.toggleText, { color: priceType === 'fix' ? '#fff' : theme.icon }]}>Fix</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, priceType === 'km' && { backgroundColor: theme.primary }]}
                                        onPress={() => setPriceType('km')}
                                    >
                                        <Text style={[styles.toggleText, { color: priceType === 'km' ? '#fff' : theme.icon }]}>/km</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.primary }]}
                        onPress={handleSave}
                    >
                        <Check size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>Publish Route</Text>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 24,
        gap: 32,
    },
    section: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    stepBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    mapContainer: {
        height: 240,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 16,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 8,
    },
    overlayText: {
        fontWeight: '600',
        fontSize: 12,
    },
    metricsCard: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginTop: 12,
        gap: 24,
    },
    metric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metricText: {
        fontWeight: '700',
        fontSize: 14,
    },
    divider: {
        width: 1,
        height: 20,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    inputGroup: {
        flex: 1,
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    input: {
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: '600',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    dayText: {
        fontSize: 12,
        fontWeight: '700',
    },
    carsScroll: {
        gap: 12,
        paddingVertical: 4,
    },
    carCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingRight: 20,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    carName: {
        fontWeight: '700',
        fontSize: 14,
    },
    toggleContainer: {
        flexDirection: 'row',
        height: 50,
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
    },
    toggleBtn: {
        flex: 1,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '700',
    },
    saveButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
