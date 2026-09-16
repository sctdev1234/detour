import { useUIStore } from '@/store/useUIStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Car, Check, Clock, MapPin, Route as RouteIcon, X, Maximize2, Search, Plus, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useEffect, useState, useRef, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View, Modal, TextInput, ActivityIndicator, Animated as RNAnimated } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DetourMap from '../../components/Map';
import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useCars } from '../../hooks/api/useCarQueries';
import { useAddRoute } from '../../hooks/api/useTripQueries';
import { RouteService } from '../../services/RouteService';
import { useAuthStore } from '../../store/useAuthStore';
import { LatLng } from '../../store/useTripStore';
import DateTimePicker from '@react-native-community/datetimepicker';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AddRouteScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { user } = useAuthStore();
    const { mutateAsync: addRoute, isPending: isAddingRoute } = useAddRoute();
    const { data: cars = [] } = useCars();

    const { showToast } = useUIStore();

    const [points, setPoints] = useState<(LatLng | null)[]>([null, null]);
    const [timeStart, setTimeStart] = useState('08:00');
    const [timeArrival, setTimeArrival] = useState('09:00');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedCarId, setSelectedCarId] = useState('');
    const [routeMetrics, setRouteMetrics] = useState<{ distance: number; duration: number; geometry: string } | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [pointAddresses, setPointAddresses] = useState<string[]>(['', '']);
    const [isMapModalVisible, setIsMapModalVisible] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [showTimePicker, setShowTimePicker] = useState(false);
    
    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<{ placeId?: string; label: string; latitude?: number; longitude?: number }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchFocusPoint, setSearchFocusPoint] = useState<LatLng | null>(null);

    // Map Center Pin States
    const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
    const [centerAddress, setCenterAddress] = useState<string>('Move map to select');
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [isMapDragging, setIsMapDragging] = useState(false);
    const pinTranslateY = useRef(new RNAnimated.Value(0)).current;
    const pinScale = useRef(new RNAnimated.Value(1)).current;

    const reverseGeocodeAbortControllerRef = useRef<AbortController | null>(null);

    // Clean up abort controllers
    useEffect(() => {
        return () => {
            if (reverseGeocodeAbortControllerRef.current) {
                reverseGeocodeAbortControllerRef.current.abort();
            }
        };
    }, []);

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

    const handleSelectSuggestion = async (suggestion: { placeId?: string; label: string; latitude?: number; longitude?: number }) => {
        let lat = suggestion.latitude;
        let lng = suggestion.longitude;

        if (suggestion.placeId && (!lat || !lng)) {
            setIsResolvingAddress(true);
            const details = await RouteService.getPlaceDetails(suggestion.placeId);
            setIsResolvingAddress(false);
            if (details) {
                lat = details.latitude;
                lng = details.longitude;
            } else {
                return;
            }
        }

        if (lat === undefined || lng === undefined) return;

        const newPoint: LatLng = {
            latitude: lat,
            longitude: lng
        };
        // Don't auto-add, just center map
        setSearchFocusPoint(newPoint);
        setSearchQuery('');
        setSuggestions([]);
    };

    // Animate map pin when dragging and fetch address when stopped
    useEffect(() => {
        if (isMapDragging) {
            if (reverseGeocodeAbortControllerRef.current) {
                reverseGeocodeAbortControllerRef.current.abort();
                reverseGeocodeAbortControllerRef.current = null;
            }
            RNAnimated.parallel([
                RNAnimated.spring(pinTranslateY, { toValue: -15, useNativeDriver: true, damping: 15, mass: 0.8, stiffness: 200 }),
                RNAnimated.spring(pinScale, { toValue: 1.1, useNativeDriver: true, damping: 15, mass: 0.8, stiffness: 200 })
            ]).start();
        } else {
            RNAnimated.parallel([
                RNAnimated.spring(pinTranslateY, { toValue: 0, useNativeDriver: true, damping: 12, mass: 0.6, stiffness: 180 }),
                RNAnimated.spring(pinScale, { toValue: 1, useNativeDriver: true, damping: 12, mass: 0.6, stiffness: 180 })
            ]).start();

            if (mapCenter) {
                if (reverseGeocodeAbortControllerRef.current) {
                    reverseGeocodeAbortControllerRef.current.abort();
                }
                const controller = new AbortController();
                reverseGeocodeAbortControllerRef.current = controller;

                setIsResolvingAddress(true);
                RouteService.reverseGeocode(mapCenter.latitude, mapCenter.longitude, controller.signal)
                    .then(addr => {
                        if (addr) setCenterAddress(addr);
                    })
                    .catch((err) => {
                        if (err.name !== 'AbortError') {
                            setCenterAddress('Selected Location');
                        }
                    })
                    .finally(() => {
                        if (reverseGeocodeAbortControllerRef.current === controller) {
                            setIsResolvingAddress(false);
                            reverseGeocodeAbortControllerRef.current = null;
                        }
                    });
            }
        }
    }, [isMapDragging, mapCenter]);

    const handleAddCenterPoint = () => {
        if (!mapCenter) return;
        setSearchFocusPoint(null);
        
        let newPoints = [...points];
        if (editingIndex !== null) {
            newPoints[editingIndex] = mapCenter;
            setEditingIndex(null);
        } else {
            const firstEmptyIndex = newPoints.findIndex(p => p === null);
            if (firstEmptyIndex !== -1) {
                newPoints[firstEmptyIndex] = mapCenter;
            } else {
                newPoints.push(mapCenter);
            }
        }
        
        handlePointsChange(newPoints);
        
        if (editingIndex !== null) {
            setIsMapModalVisible(false);
        } else if (newPoints.filter(p => p !== null).length >= 2) {
            setIsMapModalVisible(false);
        }
    };

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

    const handlePointsChange = async (newPoints: (LatLng | null)[]) => {
        setPoints(newPoints);
        
        const validPoints = newPoints.filter(p => p !== null) as LatLng[];
        
        if (validPoints.length >= 2) {
            setIsCalculating(true);
            try {
                const start = validPoints[0];
                const end = validPoints[validPoints.length - 1];
                const result = await RouteService.calculateRoute(start, end);

                setRouteMetrics({
                    distance: result.distanceKm,
                    duration: result.durationMinutes,
                    geometry: result.geometry
                });

                // Update Arrival Time based on the new duration
                const [h, m] = timeStart.split(':');
                const d = new Date();
                d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                const arrivalD = new Date(d.getTime() + result.durationMinutes * 60000);
                const ah = arrivalD.getHours().toString().padStart(2, '0');
                const am = arrivalD.getMinutes().toString().padStart(2, '0');
                setTimeArrival(`${ah}:${am}`);
            } catch (error) {
                console.error('Failed to calculate route', error);
            } finally {
                setIsCalculating(false);
            }
        } else {
            setRouteMetrics(null);
        }

        // Fetch addresses for each point
        try {
            const addresses = await Promise.all(
                newPoints.map(p => p ? RouteService.reverseGeocode(p.latitude, p.longitude) : Promise.resolve(''))
            );
            setPointAddresses(addresses);
        } catch (error) {
            console.error('Failed to fetch addresses', error);
        }
    };

    const handleSave = async () => {
        const validPoints = points.filter(p => p !== null) as LatLng[];
        const validAddresses = pointAddresses.filter((_, i) => points[i] !== null);

        if (validPoints.length < 2) {
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
                startPoint: { ...validPoints[0], address: validAddresses[0] },
                endPoint: { ...validPoints[validPoints.length - 1], address: validAddresses[validPoints.length - 1] },
                waypoints: validPoints.slice(1, -1).map((p, i) => ({ ...p, address: validAddresses[i + 1] })),
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

    const memoizedBoundsPoints = useMemo(() => searchFocusPoint ? [searchFocusPoint] : undefined, [searchFocusPoint]);

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, backgroundColor: theme.surface }]}>
                <TouchableOpacity 
                    style={[styles.headerBackBtn, { backgroundColor: theme.background }]}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>

                <Text style={[styles.title, { color: theme.text }]}>New Route</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>Plan your next trip</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Step 1: Map */}
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Route details</Text>
                        </View>
                        
                        <View style={styles.timelineContainer}>
                            {points.map((point, index) => {
                                const isStart = index === 0;
                                const isEnd = index === points.length - 1 && points.length > 1;
                                
                                return (
                                    <View style={styles.timelineRow} key={index}>
                                        <View style={styles.timelineGraphic}>
                                            <View style={[styles.timelineDot, { backgroundColor: isStart ? '#10b981' : isEnd ? theme.text : theme.primary }]} />
                                            {!isEnd && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
                                        </View>
                                        <View style={styles.timelineContent}>
                                            <Text style={[styles.timelineLabel, { color: theme.textSecondary }]}>{isStart ? 'Departure' : isEnd ? 'Destination' : `Waypoint ${index}`}</Text>
                                            <TouchableOpacity 
                                                style={[styles.timelineInput, { backgroundColor: theme.background, borderWidth: 0 }]}
                                                onPress={() => {
                                                    setEditingIndex(index);
                                                    setIsMapModalVisible(true);
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={[styles.timelineAddress, { color: point ? theme.text : theme.textSecondary }]} numberOfLines={1}>
                                                    {point ? pointAddresses[index] || 'Selected location' : `Select ${isStart ? 'departure' : 'destination'}...`}
                                                </Text>
                                                {point && (
                                                    <TouchableOpacity 
                                                        style={styles.timelineClear}
                                                        onPress={() => {
                                                            const n = [...points];
                                                            n[index] = null;
                                                            handlePointsChange(n);
                                                        }}
                                                    >
                                                        <X size={14} color={theme.textSecondary} />
                                                    </TouchableOpacity>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={[styles.mapContainer, { backgroundColor: theme.background, borderWidth: 0, marginTop: 12 }]}
                            onPress={() => setIsMapModalVisible(true)}
                            activeOpacity={0.9}
                        >
                            <DetourMap 
                                mode="picker" 
                                initialPoints={points.filter(p => p !== null) as LatLng[]} 
                                readOnly={true} 
                                theme={theme} 
                                savedPlaces={user?.savedPlaces} 
                                interactive={false}
                            />
                            <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.mapOverlay}>
                                <Maximize2 size={16} color={theme.text} />
                                <Text style={[styles.overlayText, { color: theme.text }]}>
                                    Map View
                                </Text>
                            </BlurView>
                        </TouchableOpacity>

                        {isCalculating && <Text style={{ color: theme.icon, textAlign: 'center', marginTop: 8 }}>Calculating route...</Text>}

                        {routeMetrics && (
                            <View style={[styles.metricsCard, { backgroundColor: theme.background, borderWidth: 0 }]}>
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
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.section, { marginTop: 24 }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Time & Schedule</Text>
                        </View>

                        <View style={{ backgroundColor: theme.background, borderRadius: 20, padding: 8, borderWidth: 0 }}>
                            <TouchableOpacity
                                style={styles.timeRow}
                                onPress={() => setShowTimePicker(true)}
                                activeOpacity={0.7}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                    <View style={[styles.timeIconBg, { backgroundColor: theme.primary + '15' }]}>
                                        <Clock size={20} color={theme.primary} />
                                    </View>
                                    <Text style={[styles.timeRowLabel, { color: theme.text }]}>Departure Time</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[styles.timeRowValue, { color: theme.textSecondary }]}>{timeStart}</Text>
                                    <ChevronRight size={18} color={theme.border} />
                                </View>
                            </TouchableOpacity>

                            {routeMetrics && routeMetrics.duration && (
                                <View style={styles.timeRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                        <View style={[styles.timeIconBg, { backgroundColor: theme.text + '05' }]}>
                                            <Clock size={20} color={theme.textSecondary} />
                                        </View>
                                        <Text style={[styles.timeRowLabel, { color: theme.textSecondary }]}>Estimated Arrival</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.timeRowValue, { color: theme.textSecondary }]}>~{timeArrival}</Text>
                                        <View style={{ width: 18 }} />
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Bottom Sheet Time Picker Modal (iOS) */}
                        {Platform.OS === 'ios' ? (
                            <Modal visible={showTimePicker} transparent={true} animationType="fade">
                                <View style={styles.pickerModalOverlay}>
                                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowTimePicker(false)} />
                                    <Animated.View entering={FadeInDown.springify()} style={[styles.pickerModalContent, { backgroundColor: theme.background }]}>
                                        <View style={[styles.pickerModalHeader, { borderBottomColor: theme.border }]}>
                                            <TouchableOpacity onPress={() => setShowTimePicker(false)} style={{ flex: 1 }}>
                                                <Text style={[styles.pickerModalCancel, { color: theme.textSecondary }]}>Cancel</Text>
                                            </TouchableOpacity>
                                            <Text style={[styles.pickerModalTitle, { color: theme.text }]}>Select Time</Text>
                                            <TouchableOpacity onPress={() => setShowTimePicker(false)} style={{ flex: 1, alignItems: 'flex-end' }}>
                                                <Text style={[styles.pickerModalDone, { color: theme.primary }]}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <DateTimePicker
                                            value={(() => {
                                                const [h, m] = timeStart.split(':');
                                                const d = new Date();
                                                d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                                                return d;
                                            })()}
                                            mode="time"
                                            is24Hour={true}
                                            display="spinner"
                                            onChange={(event, selectedDate) => {
                                                if (selectedDate) {
                                                    const h = selectedDate.getHours().toString().padStart(2, '0');
                                                    const m = selectedDate.getMinutes().toString().padStart(2, '0');
                                                    const newTimeStart = `${h}:${m}`;
                                                    setTimeStart(newTimeStart);
                                                    
                                                    if (routeMetrics?.duration) {
                                                        const arrivalD = new Date(selectedDate.getTime() + routeMetrics.duration * 60000);
                                                        const ah = arrivalD.getHours().toString().padStart(2, '0');
                                                        const am = arrivalD.getMinutes().toString().padStart(2, '0');
                                                        setTimeArrival(`${ah}:${am}`);
                                                    }
                                                }
                                            }}
                                            textColor={theme.text}
                                            style={{ height: 216, width: '100%', alignSelf: 'center' }}
                                        />
                                    </Animated.View>
                                </View>
                            </Modal>
                        ) : (
                            showTimePicker && (
                                <DateTimePicker
                                    value={(() => {
                                        const [h, m] = timeStart.split(':');
                                        const d = new Date();
                                        d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                                        return d;
                                    })()}
                                    mode="time"
                                    is24Hour={true}
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowTimePicker(false);
                                        if (selectedDate) {
                                            const h = selectedDate.getHours().toString().padStart(2, '0');
                                            const m = selectedDate.getMinutes().toString().padStart(2, '0');
                                            const newTimeStart = `${h}:${m}`;
                                            setTimeStart(newTimeStart);
                                            
                                            if (routeMetrics?.duration) {
                                                const arrivalD = new Date(selectedDate.getTime() + routeMetrics.duration * 60000);
                                                const ah = arrivalD.getHours().toString().padStart(2, '0');
                                                const am = arrivalD.getMinutes().toString().padStart(2, '0');
                                                setTimeArrival(`${ah}:${am}`);
                                            }
                                        }
                                    }}
                                />
                            )
                        )}

                        <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16, marginBottom: 8 }]}>Repeat on</Text>
                        <View style={styles.daysGrid}>
                            {DAYS.map(day => {
                                const isSelected = selectedDays.includes(day);
                                return (
                                    <TouchableOpacity
                                        key={day}
                                        style={[
                                            styles.dayItem,
                                            {
                                                backgroundColor: isSelected ? theme.text : 'transparent',
                                                borderColor: isSelected ? theme.text : theme.border,
                                                borderWidth: 1,
                                            }
                                        ]}
                                        onPress={() => toggleDay(day)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.dayText, { color: isSelected ? theme.background : theme.text }]}>{day}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>

                    {/* Step 3: Car */}
                    <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.section, { marginTop: 24 }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Vehicle</Text>
                        </View>

                        {cars.length === 0 ? (
                            <TouchableOpacity
                                style={[styles.carCard, { backgroundColor: theme.surface, borderColor: theme.border, justifyContent: 'center', height: 80, borderWidth: 1 }]}
                                onPress={() => router.push('/(driver)/add-car')}
                            >
                                <Text style={{ color: theme.text, fontWeight: '700' }}>+ Add a Car First</Text>
                            </TouchableOpacity>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carsScroll}>
                                {cars.map(car => {
                                    const isSelected = selectedCarId === car.id;
                                    return (
                                        <TouchableOpacity
                                            key={car.id}
                                            style={[
                                                styles.carCard,
                                                {
                                                    backgroundColor: isSelected ? theme.text : theme.background,
                                                    borderColor: isSelected ? theme.text : 'transparent',
                                                    borderWidth: 0,
                                                    shadowColor: theme.text,
                                                    shadowOpacity: isSelected ? 0.2 : 0,
                                                    shadowRadius: 10,
                                                    elevation: isSelected ? 4 : 0
                                                }
                                            ]}
                                            onPress={() => setSelectedCarId(car.id)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={[styles.carIconBg, { backgroundColor: isSelected ? theme.background + '20' : theme.background }]}>
                                                <Car size={24} color={isSelected ? theme.background : theme.icon} />
                                            </View>
                                            {(() => {
                                                const parts = car.model.split(' | ');
                                                const modelName = parts[0] || car.model;
                                                const plateNumber = parts[1] ? parts[1].replace(/-/g, ' | ') : '';
                                                return (
                                                    <View>
                                                        <Text style={[styles.carName, { color: isSelected ? theme.background : theme.text }]}>{modelName}</Text>
                                                        <Text style={{ fontSize: 12, color: isSelected ? theme.background + '99' : theme.textSecondary }}>
                                                            {car.marque}{plateNumber ? ` • ${plateNumber}` : ''}
                                                        </Text>
                                                    </View>
                                                );
                                            })()}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </Animated.View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isAddingRoute || isCalculating}
                        activeOpacity={0.9}
                        style={{ marginTop: 40 }}
                    >
                        <View
                            style={[
                                styles.saveButton,
                                { 
                                    backgroundColor: theme.text,
                                    opacity: isAddingRoute || isCalculating ? 0.7 : 1 
                                }
                            ]}
                        >
                            <Check size={20} color={theme.background} />
                            <Text style={[styles.saveButtonText, { color: theme.background }]}>{isAddingRoute ? 'Publishing...' : 'Publish Route'}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Full Screen Map Picker Modal */}
            <Modal
                visible={isMapModalVisible}
                animationType="slide"
                onRequestClose={() => setIsMapModalVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <View style={{ flex: 1, position: 'relative' }}>
                        <DetourMap 
                            mode="picker" 
                            initialPoints={points.filter(p => p !== null) as LatLng[]}
                            onPointsChange={(newValidPoints) => {
                                let newPoints = [...points];
                                let validIdx = 0;
                                for (let i = 0; i < newPoints.length; i++) {
                                    if (newPoints[i] !== null) {
                                        if (validIdx < newValidPoints.length) {
                                            newPoints[i] = newValidPoints[validIdx];
                                        } else {
                                            newPoints[i] = null;
                                        }
                                        validIdx++;
                                    }
                                }
                                handlePointsChange(newPoints);
                            }} 
                            theme={theme} 
                            savedPlaces={user?.savedPlaces}
                            fullScreen
                            height="100%"
                            hidePickerControls={true}
                            disableTapToAdd={true}
                            boundsPoints={memoizedBoundsPoints}
                            onMapPress={() => setSearchFocusPoint(null)}
                            onRegionChange={(region) => {
                                setIsMapDragging(true);
                                setMapCenter({ latitude: region.latitude, longitude: region.longitude });
                                if (searchFocusPoint) setSearchFocusPoint(null);
                            }}
                            onRegionChangeComplete={(region) => {
                                setIsMapDragging(false);
                                setMapCenter({ latitude: region.latitude, longitude: region.longitude });
                            }}
                        />

                        {/* Top Left Back Button */}
                        <TouchableOpacity
                            style={[styles.floatingBackBtn, { backgroundColor: theme.surface }]}
                            onPress={() => setIsMapModalVisible(false)}
                            activeOpacity={0.8}
                        >
                            <X size={24} color={theme.text} />
                        </TouchableOpacity>

                        {/* Center Pin Overlay & Address Badge */}
                        {!(points.filter(p => p !== null).length >= 2 && editingIndex === null) && (
                            <View style={styles.centerPinWrapper} pointerEvents="none">
                                <RNAnimated.View style={[
                                    styles.centerPinContainer,
                                    { transform: [{ translateY: pinTranslateY }, { scale: pinScale }] }
                                ]}>
                                    {/* Address Badge */}
                                    <View style={styles.addressBadge}>
                                        <Text style={styles.addressBadgeText} numberOfLines={1}>
                                            {isMapDragging ? 'Moving map...' : (isResolvingAddress ? 'Searching...' : centerAddress)}
                                        </Text>
                                    </View>
                                    <View style={[styles.centerPinBubble, { backgroundColor: '#1C1C1E' }]}>
                                        <View style={styles.pinInnerDot} />
                                    </View>
                                    <View style={[styles.pinNeedle, { backgroundColor: '#1C1C1E' }]} />
                                </RNAnimated.View>
                                <View style={styles.pinGroundShadow} />
                            </View>
                        )}

                        {/* Floating Clear Route Button (Top Right) */}
                        {points.filter(p => p !== null).length > 0 && (
                            <TouchableOpacity 
                                style={[styles.pointsBadge, { backgroundColor: '#ef4444' }]}
                                onPress={() => {
                                    handlePointsChange([null, null]);
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.pointsBadgeText, { color: '#FFF' }]}>
                                    Recommencer
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Modern Floating Search Bar */}
                        <View style={[styles.searchContainer, { top: Platform.OS === 'ios' ? 110 : 90 }]}>
                            <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5, borderRadius: 24, marginHorizontal: 20 }]}>
                                <Search size={20} color={theme.icon} style={styles.searchIcon} />
                                <TextInput
                                    style={[styles.searchInput, { color: theme.text }]}
                                    placeholder="Search places..."
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
                                <View style={[styles.suggestionsContainer, { backgroundColor: theme.surface, borderColor: theme.border, marginHorizontal: 20, borderRadius: 16, marginTop: 8 }]}>
                                    <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                                        {suggestions.map((item, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                                                onPress={() => handleSelectSuggestion(item)}
                                            >
                                                <View style={styles.suggestionIconContainer}>
                                                    <MapPin size={18} color={theme.primary} />
                                                </View>
                                                <View style={styles.suggestionTextContainer}>
                                                    <Text style={[styles.suggestionText, { color: theme.text }]} numberOfLines={1}>
                                                        {item.label}
                                                    </Text>
                                                    {item.subtitle && (
                                                        <Text style={[styles.suggestionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                                                            {item.subtitle}
                                                        </Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Large Terminé Button at Bottom */}
                        {!(points.filter(p => p !== null).length >= 2 && editingIndex === null) && (
                            <View style={styles.bottomTermineContainer}>
                                <TouchableOpacity
                                    style={styles.termineBtn}
                                    onPress={handleAddCenterPoint}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.termineBtnText}>
                                        {editingIndex !== null ? 'Confirmer' : (points.filter(p => p !== null).length === 0 ? 'Ajouter Départ' : 'Ajouter Destination (Terminé)')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
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
    headerBackBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
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
        display: 'none',
    },
    stepText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
        display: 'none',
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
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    timeIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeRowLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    timeRowValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    pickerModalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    pickerModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    pickerModalTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    pickerModalCancel: {
        fontSize: 16,
        fontWeight: '500',
    },
    pickerModalDone: {
        fontSize: 16,
        fontWeight: '700',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayItem: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
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
    timelineContainer: {
        paddingVertical: 8,
        gap: 16,
    },
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    timelineGraphic: {
        width: 24,
        alignItems: 'center',
        marginRight: 12,
        marginTop: 4,
    },
    timelineDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    timelineLine: {
        width: 2,
        height: 54,
        marginTop: 4,
        marginBottom: -16,
    },
    timelineContent: {
        flex: 1,
    },
    timelineLabel: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    timelineInput: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
    },
    timelineAddress: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    timelineClear: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
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
        marginLeft: 12,
    },
    // Floating Top Left Back Btn
    floatingBackBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        zIndex: 100,
    },
    // Top Right Points Badge
    pointsBadge: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        zIndex: 100,
    },
    pointsBadgeText: {
        fontWeight: '800',
        fontSize: 14,
    },
    // InDrive Style Center Pin
    centerPinWrapper: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
    centerPinContainer: { alignItems: 'center', marginTop: -80 },
    addressBadge: {
        backgroundColor: '#1C1C1E',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        marginBottom: 8,
        maxWidth: 250,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    addressBadgeText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    centerPinBubble: { width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
    pinInnerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
    pinNeedle: { width: 2, height: 16 },
    pinGroundShadow: { width: 12, height: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 2 },
    
    // Large Terminé Button
    bottomTermineContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 40 : 20,
        left: 20,
        right: 20,
        zIndex: 100,
    },
    termineBtn: {
        backgroundColor: '#C8F32F', // InDrive Greenish Yellow
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    termineBtnText: {
        color: '#1C1C1E', // Dark text on bright button
        fontSize: 18,
        fontWeight: '800',
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
    suggestionIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(200, 243, 47, 0.2)', // Light primary color background
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    suggestionTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    suggestionText: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    suggestionSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    }
});
