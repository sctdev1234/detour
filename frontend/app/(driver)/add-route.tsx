import { useUIStore } from '@/store/useUIStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Car, Check, Clock, MapPin, Route as RouteIcon, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DetourMap from '../../components/Map';
import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useCars } from '../../hooks/api/useCarQueries';
import { useAddRoute } from '../../hooks/api/useTripQueries';
import { RouteService } from '../../services/RouteService';
import { useAuthStore } from '../../store/useAuthStore';
import { LatLng } from '../../store/useTripStore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AddRouteScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { user } = useAuthStore();
    const { mutateAsync: addRoute, isPending: isAddingRoute } = useAddRoute();
    const { data: cars = [] } = useCars();

    const { showToast } = useUIStore();

    const [points, setPoints] = useState<LatLng[]>([]);
    const [timeStart, setTimeStart] = useState('08:00');
    const [timeArrival, setTimeArrival] = useState('09:00');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    // Price removed for drivers - defaulted to 0
    const [selectedCarId, setSelectedCarId] = useState('');
    const [routeMetrics, setRouteMetrics] = useState<{ distance: number; duration: number; geometry: string } | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [pointAddresses, setPointAddresses] = useState<string[]>([]);

    // Initialize selected car when cars are loaded
    useEffect(() => {
        if (cars.length > 0 && !selectedCarId) {
            const defaultCar = cars.find(c => c.isDefault);
            setSelectedCarId(defaultCar ? defaultCar.id : cars[0].id);
        }
    }, [cars, selectedCarId]);

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

                setRouteMetrics({
                    distance: result.distanceKm,
                    duration: result.durationMinutes,
                    geometry: result.geometry
                });
            } catch (error) {
                console.error('Failed to calculate route', error);
            } finally {
                setIsCalculating(false);
            }

            // Fetch addresses for each point
            try {
                const addresses = await Promise.all(
                    newPoints.map(p => RouteService.reverseGeocode(p.latitude, p.longitude))
                );
                setPointAddresses(addresses);
            } catch (error) {
                console.error('Failed to fetch addresses', error);
            }
        } else {
            setRouteMetrics(null);
            setPointAddresses([]);
        }
    };

    const handleSave = async () => {
        if (points.length < 2) {
            showToast('Please select a Pickup and Dropoff point', 'warning');
            return;
        }
        if (!selectedCarId) {
            showToast('Please select a car for this route', 'warning');
            return;
        }
        if (selectedDays.length === 0) {
            showToast('Please select at least one day', 'warning');
            return;
        }

        try {
            await addRoute({
                role: 'driver',
                carId: selectedCarId,
                startPoint: { ...points[0], address: pointAddresses[0] },
                endPoint: { ...points[points.length - 1], address: pointAddresses[points.length - 1] },
                waypoints: points.slice(1, -1).map((p, i) => ({ ...p, address: pointAddresses[i + 1] })),
                timeStart,
                timeArrival,
                days: selectedDays,
                price: 0, // Default price for drivers
                priceType: 'fix',
                status: 'pending',
                distanceKm: routeMetrics?.distance,
                estimatedDurationMin: routeMetrics?.duration,
                routeGeometry: routeMetrics?.geometry,
            });
            showToast('Route created successfully!', 'success');
            router.back();
        } catch (error) {
            showToast('Failed to create route', 'error');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={colorScheme === 'dark' ? [theme.surface, theme.background] : [theme.surface, theme.background]}
                style={[styles.header, { paddingTop: 60, paddingBottom: 20 }]}
            >
                <Text style={[styles.title, { color: theme.text }]}>New Route</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>Plan your next trip</Text>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Step 1: Map */}
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <LinearGradient
                                colors={[theme.primary, theme.secondary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.stepBadge}
                            >
                                <Text style={styles.stepText}>1</Text>
                            </LinearGradient>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Route Points</Text>
                        </View>

                        <View style={[styles.mapContainer, { borderColor: theme.border }]}>
                            <DetourMap mode="picker" onPointsChange={handlePointsChange} theme={theme} savedPlaces={user?.savedPlaces} />
                            {points.length === 0 && (
                                <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.mapOverlay}>
                                    <MapPin size={24} color={theme.primary} />
                                    <Text style={[styles.overlayText, { color: theme.text }]}>Tap map to add points</Text>
                                </BlurView>
                            )}
                        </View>

                        {points.length > 0 && (
                            <View style={styles.pointNamesContainer}>
                                {points.map((point, index) => (
                                    <View key={index} style={[styles.pointRow, { backgroundColor: theme.surface }]}>
                                        <View style={[styles.pointBadge, {
                                            backgroundColor: index === 0 ? '#10b981' : index === points.length - 1 ? '#ef4444' : theme.primary
                                        }]}>
                                            <Text style={styles.pointBadgeText}>{index + 1}</Text>
                                        </View>
                                        <View style={styles.pointInfo}>
                                            <Text style={[styles.pointName, { color: theme.text }]} numberOfLines={1}>
                                                {pointAddresses[index] || `Point ${index + 1}`}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.deletePointButton}
                                            onPress={() => {
                                                const newPoints = points.filter((_, i) => i !== index);
                                                handlePointsChange(newPoints);
                                            }}
                                        >
                                            <X size={16} color={theme.icon} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {isCalculating && <Text style={{ color: theme.icon, textAlign: 'center', marginTop: 8 }}>Calculating route...</Text>}

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
                    </Animated.View>

                    {/* Step 2: Schedule */}
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <LinearGradient
                                colors={[theme.primary, theme.secondary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.stepBadge}
                            >
                                <Text style={styles.stepText}>2</Text>
                            </LinearGradient>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Time & Schedule</Text>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <PremiumInput
                                    label="Departure"
                                    value={timeStart}
                                    onChangeText={setTimeStart}
                                    placeholder="08:00"
                                    icon={Clock}
                                />
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={{ flex: 1 }}>
                                <PremiumInput
                                    label="Arrival"
                                    value={timeArrival}
                                    onChangeText={setTimeArrival}
                                    placeholder="09:00"
                                    icon={Clock}
                                />
                            </View>
                        </View>

                        <Text style={[styles.label, { color: theme.textSecondary, marginTop: 8, marginBottom: 12 }]}>Repeat on</Text>
                        <View style={styles.daysGrid}>
                            {DAYS.map(day => (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayItem,
                                        {
                                            backgroundColor: selectedDays.includes(day) ? theme.primary : theme.surface,
                                            borderColor: selectedDays.includes(day) ? theme.primary : theme.border
                                        }
                                    ]}
                                    onPress={() => toggleDay(day)}
                                >
                                    <Text style={[styles.dayText, { color: selectedDays.includes(day) ? '#fff' : theme.text }]}>{day}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>

                    {/* Step 3: Car & Pricing */}
                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <LinearGradient
                                colors={[theme.primary, theme.secondary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.stepBadge}
                            >
                                <Text style={styles.stepText}>3</Text>
                            </LinearGradient>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Vehicle</Text>
                        </View>
                        <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 12 }]}>Select Car</Text>

                        {cars.length === 0 ? (
                            <TouchableOpacity
                                style={[styles.carCard, { backgroundColor: theme.surface, borderColor: theme.border, justifyContent: 'center', height: 80 }]}
                                onPress={() => router.push('/(driver)/add-car')}
                            >
                                <Text style={{ color: theme.primary, fontWeight: '700' }}>+ Add a Car First</Text>
                            </TouchableOpacity>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carsScroll}>
                                {cars.map(car => (
                                    <TouchableOpacity
                                        key={car.id}
                                        style={[
                                            styles.carCard,
                                            {
                                                backgroundColor: theme.surface,
                                                borderColor: selectedCarId === car.id ? theme.primary : 'transparent',
                                                borderWidth: 2,
                                                shadowColor: theme.text,
                                                shadowOpacity: 0.05,
                                                shadowRadius: 10,
                                                elevation: 2
                                            }
                                        ]}
                                        onPress={() => setSelectedCarId(car.id)}
                                    >
                                        <View style={[styles.carIconBg, { backgroundColor: selectedCarId === car.id ? theme.primary + '20' : theme.background }]}>
                                            <Car size={24} color={selectedCarId === car.id ? theme.primary : theme.icon} />
                                        </View>
                                        <View>
                                            <Text style={[styles.carName, { color: theme.text }]}>{car.model}</Text>
                                            <Text style={{ fontSize: 12, color: theme.textSecondary }}>{car.marque}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {/* Price section removed for drivers */}
                    </Animated.View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isAddingRoute || isCalculating}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[theme.primary, theme.secondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.saveButton, { opacity: isAddingRoute || isCalculating ? 0.7 : 1 }]}
                        >
                            <Check size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>{isAddingRoute ? 'Publishing...' : 'Publish Route'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 24,
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    content: {
        padding: 24,
        gap: 24,
    },
    section: {
        gap: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    stepBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    mapContainer: {
        height: 280,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
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
    metricsCard: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginTop: 12,
        gap: 32,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    metric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metricText: {
        fontWeight: '800',
        fontSize: 16,
    },
    divider: {
        width: 1,
        height: 24,
    },
    row: {
        flexDirection: 'row',
    },
    inputGroup: {
        flex: 1,
        gap: 10,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 4,
        opacity: 0.7,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        height: 56,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 18,
        fontSize: 16,
        fontWeight: '600',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        minWidth: 50,
        alignItems: 'center',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '700',
    },
    carsScroll: {
        gap: 12,
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    carCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingRight: 24,
        borderRadius: 24,
        // borderWidth: 1,
        gap: 16,
        minWidth: 160,
    },
    carIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    carName: {
        fontWeight: '700',
        fontSize: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 18,
    },
    toggleBtn: {
        flex: 1,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '700',
    },
    saveButton: {
        height: 64,
        borderRadius: 32,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginTop: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    pointNamesContainer: {
        marginTop: 16,
        gap: 12,
    },
    pointRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        // elevation: 1,
        // shadowColor: "#000",
        // shadowOpacity: 0.05,
        // shadowRadius: 4,
    },
    pointBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pointBadgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    pointInfo: {
        flex: 1,
    },
    pointName: {
        fontSize: 15,
        fontWeight: '600',
    },
    deletePointButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 18,
    }
});
