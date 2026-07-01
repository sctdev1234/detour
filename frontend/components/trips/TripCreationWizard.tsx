import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Platform,
    Dimensions,
    Animated,
    Modal,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import {
    MapPin,
    Clock,
    ChevronLeft,
    ChevronRight,
    Search,
    X,
    Plus,
    Minus,
    Check,
    User,
    Navigation,
    Crosshair,
    Home,
    Briefcase,
    Dumbbell,
    GraduationCap,
    Star
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LatLng } from '../../types';
import { RouteService } from '../../services/RouteService';
import { usePlacesStore } from '../../store/usePlacesStore';
import { useNetInfo } from '@react-native-community/netinfo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_PRESETS = ['07:00', '07:30', '08:00', '08:30', '09:00', '17:00', '17:30', '18:00'];
const SHEET_COLLAPSED_OFFSET = 250;

type Step = 'pickup' | 'destination' | 'destination_map' | 'schedule';

type Props = {
    theme: any;
    colorScheme: 'light' | 'dark';
    currentLocation: LatLng | null;
    currentAddress: string;
    mapPoints: LatLng[];
    onPointsChange: (points: LatLng[]) => void;
    onCancel: () => void;
    onConfirm: (data: {
        startPoint: LatLng;
        endPoint: LatLng;
        days: string[];
        timeStart: string;
        price: number;
        rideType: 'immediate' | 'scheduled';
    }) => Promise<void>;
    isSubmitting?: boolean;
};

export default function TripCreationWizard({
    theme,
    colorScheme,
    currentLocation,
    currentAddress,
    mapPoints,
    onPointsChange,
    onCancel,
    onConfirm,
    isSubmitting = false,
}: Props) {
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const isDark = colorScheme === 'dark';
    const netInfo = useNetInfo();

    // Step
    const [step, setStep] = useState<Step>('pickup');

    // Location state
    const [pickup, setPickup] = useState<LatLng | null>(currentLocation);
    const [pickupAddress, setPickupAddress] = useState(
        currentAddress && currentAddress !== 'Current Location' ? currentAddress : ''
    );
    const [destination, setDestination] = useState<LatLng | null>(null);
    const [destAddress, setDestAddress] = useState('');

    // Map center-pin state
    const isDraggingRef = useRef(false);
    const isReadyRef = useRef(false);
    const [centerAddress, setCenterAddress] = useState(
        currentAddress && currentAddress !== 'Current Location' ? currentAddress : ''
    );
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [mapCenter, setMapCenter] = useState<LatLng | null>(currentLocation);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ label: string; latitude: number; longitude: number; isSavedPlace?: boolean; icon?: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Schedule state
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [timeStart, setTimeStart] = useState('08:00');
    const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
    const [price, setPrice] = useState('15');
    const [rideType, setRideType] = useState<'immediate' | 'scheduled'>('immediate');

    // Animation values
    const sheetTranslateY = useRef(new Animated.Value(0)).current;
    const pinTranslateY = useRef(new Animated.Value(0)).current;
    const pinScale = useRef(new Animated.Value(1)).current;

    // Colors
    const cardBg = isDark ? 'rgba(28, 28, 30, 0.97)' : 'rgba(255, 255, 255, 0.97)';
    const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';
    const surfaceBg = isDark ? '#1C1C1E' : '#FFFFFF';

    // Allow interaction after initial map render
    useEffect(() => {
        const timer = setTimeout(() => {
            isReadyRef.current = true;
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Reset animations when entering a map-pin step
    useEffect(() => {
        if (step === 'pickup' || step === 'destination_map') {
            isDraggingRef.current = false;
            sheetTranslateY.setValue(0);
            pinTranslateY.setValue(0);
            pinScale.setValue(1);
            if (step === 'pickup') {
                setCenterAddress(pickupAddress || '');
            } else {
                setCenterAddress('');
            }
        }
    }, [step]);

    // Fit map to both points in schedule step
    useEffect(() => {
        if (step === 'schedule' && pickup && destination && mapRef.current) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates([pickup, destination], {
                    edgePadding: { top: 120, right: 60, bottom: SCREEN_HEIGHT * 0.5, left: 60 },
                    animated: true,
                });
            }, 400);
        }
    }, [step, pickup, destination]);

    // Resolve initial address on mount if empty
    useEffect(() => {
        if (!centerAddress && currentLocation) {
            (async () => {
                try {
                    const addr = await RouteService.reverseGeocode(currentLocation.latitude, currentLocation.longitude);
                    setCenterAddress(addr);
                    setPickupAddress(addr);
                } catch { /* ignore */ }
            })();
        }
    }, []);

    // =========================================
    // MAP REGION HANDLERS
    // =========================================

    const handleRegionChange = useCallback((_region: any, details?: { isGesture?: boolean }) => {
        if (!isReadyRef.current) return;
        if (details && details.isGesture === false) return;

        if (!isDraggingRef.current) {
            isDraggingRef.current = true;
            // Lift pin
            Animated.parallel([
                Animated.spring(pinTranslateY, { toValue: -20, useNativeDriver: true, damping: 15, mass: 0.8, stiffness: 200 }),
                Animated.spring(pinScale, { toValue: 1.15, useNativeDriver: true, damping: 15, mass: 0.8, stiffness: 200 }),
            ]).start();
            // Collapse sheet
            Animated.spring(sheetTranslateY, {
                toValue: SHEET_COLLAPSED_OFFSET,
                useNativeDriver: true,
                damping: 20,
                mass: 1,
                stiffness: 120,
            }).start();
        }
    }, []);

    const handleRegionChangeComplete = useCallback(async (region: any) => {
        const center: LatLng = { latitude: region.latitude, longitude: region.longitude };
        setMapCenter(center);

        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            // Drop pin
            Animated.parallel([
                Animated.spring(pinTranslateY, { toValue: 0, useNativeDriver: true, damping: 8, mass: 0.6, stiffness: 180 }),
                Animated.spring(pinScale, { toValue: 1, useNativeDriver: true, damping: 8, mass: 0.6, stiffness: 180 }),
            ]).start();
            // Expand sheet
            Animated.spring(sheetTranslateY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 18,
                mass: 1,
                stiffness: 100,
            }).start();

            // Reverse geocode
            setIsResolvingAddress(true);
            try {
                const addr = await RouteService.reverseGeocode(center.latitude, center.longitude);
                setCenterAddress(addr);
            } catch {
                setCenterAddress(`${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}`);
            } finally {
                setIsResolvingAddress(false);
            }
        }
    }, []);

    // =========================================
    // SEARCH HANDLERS
    // =========================================

    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { places } = usePlacesStore();

    const handleSearch = useCallback((text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (text.trim().length > 0) {
            // Filter saved places locally first
            const matchedPlaces = places
                .filter(p => p.label.toLowerCase().includes(text.toLowerCase()) || p.address.toLowerCase().includes(text.toLowerCase()))
                .map(p => ({ label: `${p.label} - ${p.address}`, latitude: p.latitude, longitude: p.longitude, isSavedPlace: true, icon: p.icon }));

            if (text.trim().length > 2) {
                searchTimeout.current = setTimeout(async () => {
                    setIsSearching(true);
                    try {
                        const results = await RouteService.geocode(text);
                        setSearchResults([...matchedPlaces, ...results]);
                    } catch {
                        setSearchResults(matchedPlaces);
                    } finally {
                        setIsSearching(false);
                    }
                }, 400);
            } else {
                setSearchResults(matchedPlaces);
            }
        } else {
            // Show all saved places when query is empty
            const savedResults = places.map(p => ({
                label: `${p.label} - ${p.address}`,
                latitude: p.latitude,
                longitude: p.longitude,
                isSavedPlace: true,
                icon: p.icon
            }));
            setSearchResults(savedResults);
        }
    }, [places]);

    // Initialize with saved places when search opens
    useEffect(() => {
        if (step === ('destination_search' as any) && searchQuery === '') {
            const savedResults = places.map(p => ({
                label: `${p.label} - ${p.address}`,
                latitude: p.latitude,
                longitude: p.longitude,
                isSavedPlace: true,
                icon: p.icon
            }));
            setSearchResults(savedResults);
        }
    }, [step, places]);

    const handleSelectDestination = useCallback((item: { label: string; latitude: number; longitude: number }) => {
        const point: LatLng = { latitude: item.latitude, longitude: item.longitude };
        setDestination(point);
        setDestAddress(item.label);
        setSearchQuery('');
        setSearchResults([]);
        if (pickup) {
            onPointsChange([pickup, point]);
        }
        setStep('schedule');
    }, [pickup, onPointsChange]);

    // =========================================
    // STEP HANDLERS
    // =========================================

    const confirmPickup = useCallback(() => {
        if (mapCenter) {
            setPickup(mapCenter);
            setPickupAddress(centerAddress);
            onPointsChange([mapCenter]);
            setStep('destination');
        }
    }, [mapCenter, centerAddress, onPointsChange]);

    const confirmDestinationOnMap = useCallback(() => {
        if (mapCenter) {
            setDestination(mapCenter);
            setDestAddress(centerAddress);
            if (pickup) {
                onPointsChange([pickup, mapCenter]);
            }
            setStep('schedule');
        }
    }, [mapCenter, centerAddress, pickup, onPointsChange]);

    const goBack = useCallback(() => {
        switch (step) {
            case 'pickup':
                onCancel();
                break;
            case 'destination':
                setStep('pickup');
                break;
            case 'destination_map':
                setStep('destination');
                break;
            case 'schedule':
                setStep('destination');
                break;
        }
    }, [step, onCancel]);

    const handleConfirm = useCallback(async () => {
        if (!pickup || !destination) return;
        await onConfirm({
            startPoint: pickup,
            endPoint: destination,
            days: rideType === 'scheduled' ? selectedDays : [],
            timeStart: rideType === 'scheduled' ? timeStart : new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            price: Number(price),
            rideType
        });
    }, [pickup, destination, selectedDays, timeStart, price, rideType, onConfirm]);

    const toggleDay = useCallback((day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    }, []);

    const selectWeekdays = useCallback(() => {
        setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    }, []);

    // =========================================
    // INITIAL REGION
    // =========================================

    const getInitialRegion = (forDestination: boolean) => {
        if (forDestination && pickup) {
            return {
                latitude: pickup.latitude,
                longitude: pickup.longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
            };
        }
        if (currentLocation) {
            return {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
            };
        }
        return {
            latitude: 33.5731,
            longitude: -7.5898,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    };

    // =========================================
    // RENDER: MAP WITH CENTER PIN
    // =========================================

    const renderMapPinStep = (isDestination: boolean) => {
        const pinColor = isDestination ? '#FF3B30' : '#10B981';

        return (
            <View style={styles.fullScreen}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFillObject}
                    initialRegion={getInitialRegion(isDestination)}
                    onRegionChange={handleRegionChange}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    rotateEnabled={false}
                    pitchEnabled={false}
                >
                    {/* Blue dot for current location */}
                    {currentLocation && (
                        <Marker
                            coordinate={currentLocation}
                            anchor={{ x: 0.5, y: 0.5 }}
                            zIndex={1}
                        >
                            <View style={styles.userDot}>
                                <View style={styles.userDotInner} />
                            </View>
                        </Marker>
                    )}

                    {/* Show pickup marker when picking destination */}
                    {isDestination && pickup && (
                        <Marker coordinate={pickup} anchor={{ x: 0.5, y: 1 }}>
                            <View style={[styles.existingPointMarker, { backgroundColor: '#10B981' }]}>
                                <User size={12} color="#FFF" />
                            </View>
                        </Marker>
                    )}
                </MapView>

                {/* Top gradient for contrast */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent']}
                    style={styles.topGradient}
                    pointerEvents="none"
                />

                {/* Back button */}
                <TouchableOpacity
                    style={[styles.mapBackBtn, { top: insets.top + 10 }]}
                    onPress={goBack}
                    activeOpacity={0.8}
                >
                    <BlurView intensity={80} tint="dark" style={styles.mapBackBtnBlur}>
                        <ChevronLeft size={22} color="#FFF" />
                    </BlurView>
                </TouchableOpacity>

                {/* Recenter button */}
                <TouchableOpacity
                    style={[styles.recenterBtn, { bottom: SHEET_COLLAPSED_OFFSET + 80 }]}
                    onPress={() => {
                        if (currentLocation && mapRef.current) {
                            mapRef.current.animateToRegion({
                                latitude: currentLocation.latitude,
                                longitude: currentLocation.longitude,
                                latitudeDelta: 0.008,
                                longitudeDelta: 0.008,
                            }, 500);
                        }
                    }}
                    activeOpacity={0.85}
                >
                    <Navigation size={20} color="#4F46E5" />
                </TouchableOpacity>

                {/* ===== CENTER PIN (fixed on screen center) ===== */}
                <View style={styles.centerPinWrapper} pointerEvents="none">
                    <Animated.View style={[
                        styles.centerPinContainer,
                        {
                            transform: [
                                { translateY: pinTranslateY },
                                { scale: pinScale },
                            ],
                        },
                    ]}>
                        <View style={[styles.centerPinBubble, { backgroundColor: pinColor }]}>
                            <User size={22} color="#FFF" strokeWidth={2.5} />
                        </View>
                        <View style={[styles.pinNeedle, { backgroundColor: pinColor }]} />
                    </Animated.View>
                    <View style={styles.pinGroundShadow} />
                </View>

                {/* ===== BOTTOM SHEET ===== */}
                <Animated.View
                    style={[
                        styles.mapBottomSheet,
                        { transform: [{ translateY: sheetTranslateY }] },
                    ]}
                >
                    <BlurView
                        intensity={90}
                        tint={isDark ? 'dark' : 'light'}
                        style={[styles.mapSheetInner, { backgroundColor: cardBg }]}
                    >
                        <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />

                        {/* Address display */}
                        <View style={styles.addressRow}>
                            <View style={[styles.addressDot, { backgroundColor: pinColor }]} />
                            <View style={styles.addressTextWrap}>
                                <Text style={[styles.addressLabel, { color: theme.textSecondary || '#888' }]}>
                                    {isDestination ? 'Destination' : 'Pickup location'}
                                </Text>
                                {isResolvingAddress ? (
                                    <ActivityIndicator size="small" color={theme.primary} style={{ alignSelf: 'flex-start' }} />
                                ) : (
                                    <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={2}>
                                        {centerAddress || 'Move the map to select'}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Confirm button */}
                        <TouchableOpacity
                            style={[
                                styles.confirmLocationBtn,
                                { backgroundColor: centerAddress ? theme.primary : theme.primary + '40' },
                            ]}
                            onPress={isDestination ? confirmDestinationOnMap : confirmPickup}
                            disabled={!centerAddress}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.confirmLocationText}>
                                {isDestination ? 'Confirm Destination' : 'Confirm Pickup'}
                            </Text>
                            <ChevronRight size={20} color="#FFF" />
                        </TouchableOpacity>
                    </BlurView>
                </Animated.View>
            </View>
        );
    };

    // =========================================
    // RENDER: DESTINATION SEARCH (Full screen)
    // =========================================

    const renderDestinationStep = () => {
        return (
            <View style={[styles.fullScreen, { backgroundColor: surfaceBg }]}>
                {/* Header */}
                <View style={[styles.destHeader, { paddingTop: insets.top + 12 }]}>
                    <Text style={[styles.destTitle, { color: theme.text }]}>Set your route</Text>
                    <TouchableOpacity onPress={goBack} style={styles.destCloseBtn} activeOpacity={0.7}>
                        <X size={22} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Route From / To inputs */}
                <View style={styles.routeInputsWrap}>
                    {/* FROM */}
                    <View style={[styles.routeInputRow, { backgroundColor: inputBg }]}>
                        <View style={[styles.routeInputDot, { backgroundColor: '#10B981' }]} />
                        <View style={styles.routeInputContent}>
                            <Text style={[styles.routeInputLabel, { color: isDark ? '#8E8E93' : '#6B7280' }]}>From</Text>
                            <Text style={[styles.routeInputValue, { color: theme.text }]} numberOfLines={1}>
                                {pickupAddress || 'Pickup location'}
                            </Text>
                        </View>
                    </View>

                    {/* Connector */}
                    <View style={styles.routeConnector}>
                        <View style={[styles.connectorLine, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />
                    </View>

                    {/* TO — Search input */}
                    <View style={[styles.routeInputRow, styles.routeInputActive, { backgroundColor: inputBg, borderColor: theme.primary + '60' }]}>
                        <View style={[styles.routeInputDot, { backgroundColor: '#FF3B30' }]} />
                        <View style={styles.routeInputContent}>
                            <Text style={[styles.routeInputLabel, { color: isDark ? '#8E8E93' : '#6B7280' }]}>To</Text>
                            <TextInput
                                style={[styles.routeSearchInput, { color: theme.text }]}
                                placeholder="Search destination..."
                                placeholderTextColor={isDark ? '#636366' : '#9CA3AF'}
                                value={searchQuery}
                                onChangeText={handleSearch}
                                autoFocus
                            />
                        </View>
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X size={18} color={theme.icon || '#888'} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Choose on map */}
                <TouchableOpacity
                    style={styles.chooseOnMapRow}
                    onPress={() => {
                        isReadyRef.current = false;
                        setStep('destination_map');
                        setTimeout(() => { isReadyRef.current = true; }, 1000);
                    }}
                    activeOpacity={0.7}
                >
                    <View style={[styles.chooseOnMapIcon, { backgroundColor: theme.primary + '15' }]}>
                        <Crosshair size={18} color={theme.primary} />
                    </View>
                    <Text style={[styles.chooseOnMapText, { color: theme.primary }]}>Choose on map</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />

                {/* Search results */}
                <ScrollView
                    style={styles.searchScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {isSearching && (
                        <View style={styles.searchingIndicator}>
                            <ActivityIndicator size="small" color={theme.primary} />
                            <Text style={[styles.searchingText, { color: theme.textSecondary || '#888' }]}>Searching...</Text>
                        </View>
                    )}
                    {searchResults.map((item, index) => (
                        <TouchableOpacity
                            key={`result-${index}`}
                            style={[styles.resultItem, { borderBottomColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                            onPress={() => handleSelectDestination(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.resultIcon, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                                {item.icon === 'home' ? <Home size={16} color={theme.primary} /> :
                                 item.icon === 'briefcase' ? <Briefcase size={16} color={theme.primary} /> :
                                 item.icon === 'gym' ? <Dumbbell size={16} color={theme.primary} /> :
                                 item.icon === 'graduation-cap' ? <GraduationCap size={16} color={theme.primary} /> :
                                 item.isSavedPlace ? <Star size={16} color={theme.primary} /> :
                                 <MapPin size={16} color={theme.primary} />}
                            </View>
                            <View style={styles.resultTextWrap}>
                                <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
                                    {item.label.split('-')[0].split(',')[0]}
                                </Text>
                                <Text style={[styles.resultSubtitle, { color: theme.textSecondary || '#888' }]} numberOfLines={1}>
                                    {item.label.includes('-') ? item.label.split('-')[1].trim() : item.label}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    {!isSearching && searchQuery.length > 2 && searchResults.length === 0 && (
                        <View style={styles.noResults}>
                            <Text style={[styles.noResultsText, { color: theme.textSecondary || '#888' }]}>No results found</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    };

    // =========================================
    // RENDER: SCHEDULE & PRICE
    // =========================================

    const renderScheduleStep = () => {
        const canConfirm = !!price && parseFloat(price) > 0 && (rideType === 'immediate' || (selectedDays.length > 0 && !!timeStart));

        return (
            <View style={styles.fullScreen}>
                {/* Map showing both points */}
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFillObject}
                    initialRegion={getInitialRegion(false)}
                    showsUserLocation={false}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    rotateEnabled={false}
                >
                    {currentLocation && (
                        <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={1}>
                            <View style={styles.userDot}>
                                <View style={styles.userDotInner} />
                            </View>
                        </Marker>
                    )}
                    {pickup && (
                        <Marker coordinate={pickup} anchor={{ x: 0.5, y: 1 }}>
                            <View style={[styles.routeMarker, { backgroundColor: '#10B981' }]}>
                                <User size={14} color="#FFF" strokeWidth={2} />
                            </View>
                        </Marker>
                    )}
                    {destination && (
                        <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }}>
                            <View style={[styles.routeMarker, { backgroundColor: '#FF3B30' }]}>
                                <MapPin size={14} color="#FFF" />
                            </View>
                        </Marker>
                    )}
                    {pickup && destination && (
                        <Polyline
                            coordinates={[pickup, destination]}
                            strokeColor={theme.primary}
                            strokeWidth={4}
                            lineDashPattern={[8, 4]}
                        />
                    )}
                </MapView>

                {/* Top gradient */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.4)', 'transparent']}
                    style={styles.topGradient}
                    pointerEvents="none"
                />

                {/* Back button */}
                <TouchableOpacity
                    style={[styles.mapBackBtn, { top: insets.top + 10 }]}
                    onPress={goBack}
                    activeOpacity={0.8}
                >
                    <BlurView intensity={80} tint="dark" style={styles.mapBackBtnBlur}>
                        <ChevronLeft size={22} color="#FFF" />
                    </BlurView>
                </TouchableOpacity>

                {/* Bottom gradient */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    style={styles.bottomGradient}
                    pointerEvents="none"
                />

                {/* Bottom Sheet */}
                <View style={styles.scheduleSheet}>
                    <BlurView
                        intensity={90}
                        tint={isDark ? 'dark' : 'light'}
                        style={[styles.scheduleSheetInner, { backgroundColor: cardBg }]}
                    >
                        <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
                            {/* Route summary mini */}
                            <View style={[styles.routeSummaryCard, { backgroundColor: inputBg }]}>
                                <View style={styles.routeSummaryRow}>
                                    <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
                                    <Text style={[styles.summaryText, { color: theme.text }]} numberOfLines={1}>{pickupAddress}</Text>
                                </View>
                                <View style={[styles.summaryConnector, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />
                                <View style={styles.routeSummaryRow}>
                                    <View style={[styles.summaryDot, { backgroundColor: '#FF3B30' }]} />
                                    <Text style={[styles.summaryText, { color: theme.text }]} numberOfLines={1}>{destAddress}</Text>
                                </View>
                            </View>

                            {/* Ride Type Toggle */}
                            <View style={[styles.rideTypeToggle, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                                <TouchableOpacity
                                    style={[styles.rideTypeBtn, rideType === 'immediate' && [styles.rideTypeBtnActive, { backgroundColor: theme.primary }]]}
                                    onPress={() => setRideType('immediate')}
                                    activeOpacity={0.8}
                                >
                                    <Navigation size={16} color={rideType === 'immediate' ? '#FFF' : theme.icon} />
                                    <Text style={[styles.rideTypeText, { color: rideType === 'immediate' ? '#FFF' : theme.icon }]}>Ride Now</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.rideTypeBtn, rideType === 'scheduled' && [styles.rideTypeBtnActive, { backgroundColor: theme.primary }]]}
                                    onPress={() => setRideType('scheduled')}
                                    activeOpacity={0.8}
                                >
                                    <Clock size={16} color={rideType === 'scheduled' ? '#FFF' : theme.icon} />
                                    <Text style={[styles.rideTypeText, { color: rideType === 'scheduled' ? '#FFF' : theme.icon }]}>Schedule</Text>
                                </TouchableOpacity>
                            </View>

                            {rideType === 'scheduled' && (
                                <>
                                    <View style={styles.daysHeader}>
                                        <Clock size={18} color={theme.text} />
                                        <Text style={[styles.daysTitle, { color: theme.text }]}>Repeats every</Text>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll} contentContainerStyle={styles.daysScrollContent}>
                                        {DAYS.map(day => {
                                            const isSelected = selectedDays.includes(day);
                                            return (
                                                <TouchableOpacity
                                                    key={day}
                                                    style={[
                                                        styles.dayChip,
                                                        { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', borderColor: 'transparent' },
                                                        isSelected && { backgroundColor: theme.primary + '15', borderColor: theme.primary }
                                                    ]}
                                                    onPress={() => toggleDay(day)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[styles.dayChipText, { color: isDark ? '#8E8E93' : '#6B7280' }, isSelected && { color: theme.primary, fontWeight: '600' }]}>{day}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>

                                    <TouchableOpacity style={[styles.timePickerBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]} onPress={() => setIsTimePickerVisible(true)} activeOpacity={0.7}>
                                        <Text style={[styles.timeLabel, { color: theme.textSecondary || '#888' }]}>Departure Time</Text>
                                        <Text style={[styles.timeValue, { color: theme.text }]}>{timeStart}</Text>
                                        <ChevronRight size={18} color={theme.icon || '#888'} />
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Price */}
                            <Text style={[styles.sectionLabel, { color: theme.text, marginTop: 20 }]}>Your price per trip</Text>
                            <View style={[styles.priceRow, { backgroundColor: inputBg }]}>
                                <TouchableOpacity
                                    style={[styles.priceBtn, { backgroundColor: isDark ? '#3A3A3C' : '#FFF' }]}
                                    onPress={() => setPrice(String(Math.max(5, (parseFloat(price) || 0) - 5)))}
                                >
                                    <Minus size={20} color={theme.text} />
                                </TouchableOpacity>
                                <View style={styles.priceCenter}>
                                    <TextInput
                                        style={[styles.priceInput, { color: theme.text }]}
                                        value={price}
                                        onChangeText={setPrice}
                                        keyboardType="numeric"
                                        textAlign="center"
                                    />
                                    <Text style={[styles.priceCurrency, { color: theme.textSecondary || '#888' }]}>MAD</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.priceBtn, { backgroundColor: isDark ? '#3A3A3C' : '#FFF' }]}
                                    onPress={() => setPrice(String((parseFloat(price) || 0) + 5))}
                                >
                                    <Plus size={20} color={theme.text} />
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        {/* Confirm */}
                        <TouchableOpacity
                            style={[
                                styles.finalConfirmBtn,
                                {
                                    backgroundColor: (canConfirm && netInfo.isConnected !== false) ? theme.primary : theme.primary + '40',
                                    marginBottom: Platform.OS === 'ios' ? insets.bottom : 16,
                                },
                            ]}
                            onPress={handleConfirm}
                            disabled={!canConfirm || isSubmitting || netInfo.isConnected === false}
                            activeOpacity={0.85}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Check size={20} color="#FFF" />
                                    <Text style={styles.finalConfirmText}>Confirm Trip</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </BlurView>
                </View>

                {/* Time picker modal */}
                <Modal visible={isTimePickerVisible} transparent animationType="fade" onRequestClose={() => setIsTimePickerVisible(false)}>
                    <View style={styles.modalBackdrop}>
                        <View style={[styles.timeModal, { backgroundColor: surfaceBg }]}>
                            <Text style={[styles.timeModalTitle, { color: theme.text }]}>Departure Time</Text>
                            <TextInput
                                style={[styles.timeModalInput, { color: theme.text, backgroundColor: inputBg }]}
                                value={timeStart}
                                onChangeText={setTimeStart}
                                placeholder="e.g. 08:30"
                                placeholderTextColor={isDark ? '#636366' : '#9CA3AF'}
                                maxLength={5}
                                textAlign="center"
                            />
                            <View style={styles.timePresetsGrid}>
                                {TIME_PRESETS.map(preset => (
                                    <TouchableOpacity
                                        key={preset}
                                        style={[styles.timePresetChip, { backgroundColor: timeStart === preset ? theme.primary : inputBg }]}
                                        onPress={() => setTimeStart(preset)}
                                    >
                                        <Text style={[styles.timePresetText, { color: timeStart === preset ? '#FFF' : theme.text }]}>{preset}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity
                                style={[styles.timeConfirmBtn, { backgroundColor: theme.primary }]}
                                onPress={() => setIsTimePickerVisible(false)}
                            >
                                <Text style={styles.timeConfirmText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    };

    // =========================================
    // MAIN RENDER
    // =========================================

    switch (step) {
        case 'pickup':
            return renderMapPinStep(false);
        case 'destination':
            return renderDestinationStep();
        case 'destination_map':
            return renderMapPinStep(true);
        case 'schedule':
            return renderScheduleStep();
        default:
            return renderMapPinStep(false);
    }
}

// =========================================
// STYLES
// =========================================

const styles = StyleSheet.create({
    fullScreen: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },

    // ── Gradients ──
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 130,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 180,
    },

    // ── Map back button ──
    mapBackBtn: {
        position: 'absolute',
        left: 16,
        zIndex: 20,
    },
    mapBackBtnBlur: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },

    // ── Recenter button ──
    recenterBtn: {
        position: 'absolute',
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        zIndex: 10,
    },

    // ── Center Pin ──
    centerPinWrapper: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerPinContainer: {
        alignItems: 'center',
        marginTop: -50,
    },
    centerPinBubble: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    pinNeedle: {
        width: 4,
        height: 18,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
        marginTop: -2,
    },
    pinGroundShadow: {
        width: 18,
        height: 6,
        borderRadius: 9,
        backgroundColor: 'rgba(0,0,0,0.18)',
        marginTop: 4,
    },

    // ── User location dot ──
    userDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,122,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userDotInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#007AFF',
        borderWidth: 2.5,
        borderColor: '#FFF',
    },

    // ── Existing point marker ──
    existingPointMarker: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#FFF',
        elevation: 4,
    },

    // ── Route marker (schedule step) ──
    routeMarker: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },

    // ── Map bottom sheet ──
    mapBottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    mapSheetInner: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        overflow: 'hidden',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },

    // ── Address row ──
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 20,
    },
    addressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 4,
    },
    addressTextWrap: {
        flex: 1,
        gap: 4,
    },
    addressLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    addressText: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 22,
    },

    // ── Confirm location button ──
    confirmLocationBtn: {
        flexDirection: 'row',
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    confirmLocationText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },

    // ── Destination search screen ──
    destHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    destTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    destCloseBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Route inputs ──
    routeInputsWrap: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    routeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 14,
    },
    routeInputActive: {
        borderWidth: 1.5,
    },
    routeInputDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    routeInputContent: {
        flex: 1,
    },
    routeInputLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    routeInputValue: {
        fontSize: 15,
        fontWeight: '600',
    },
    routeSearchInput: {
        fontSize: 15,
        fontWeight: '600',
        paddingVertical: 0,
        minHeight: 22,
    },
    routeConnector: {
        paddingLeft: 20,
        height: 14,
        justifyContent: 'center',
    },
    connectorLine: {
        width: 2,
        height: '100%',
        marginLeft: 14,
        borderRadius: 1,
    },

    // ── Choose on map ──
    chooseOnMapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 28,
        paddingVertical: 14,
    },
    chooseOnMapIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chooseOnMapText: {
        fontSize: 15,
        fontWeight: '700',
    },

    // ── Divider ──
    divider: {
        height: 1,
        marginHorizontal: 24,
        marginBottom: 4,
    },

    // ── Search results ──
    searchScroll: {
        flex: 1,
    },
    searchingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 20,
    },
    searchingText: {
        fontSize: 14,
        fontWeight: '600',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        gap: 14,
        borderBottomWidth: 1,
    },
    resultIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultTextWrap: {
        flex: 1,
    },
    resultTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    resultSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    noResults: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    noResultsText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // ── Schedule sheet ──
    scheduleSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: SCREEN_HEIGHT * 0.55,
    },
    scheduleSheetInner: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        overflow: 'hidden',
    },

    // ── Route summary mini ──
    routeSummaryCard: {
        borderRadius: 16,
        padding: 14,
        gap: 6,
        marginBottom: 20,
    },
    routeSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    summaryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    summaryConnector: {
        width: 2,
        height: 12,
        marginLeft: 3,
        borderRadius: 1,
    },
    summaryText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },

    // ── Ride Type Toggle ──
    rideTypeToggle: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
    },
    rideTypeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
    },
    rideTypeBtnActive: {
        elevation: 2,
    },
    rideTypeText: {
        fontSize: 15,
        fontWeight: '600',
    },

    daysHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    daysTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    daysScroll: {
        marginBottom: 16,
    },
    daysScrollContent: {
        gap: 8,
    },
    timePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        marginBottom: 20,
    },
    timeLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    timeValue: {
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
    },

    // ── Schedule section ──
    sectionLabel: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 12,
    },
    weekdaysBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    weekdaysBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    dayChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    dayChipText: {
        fontSize: 14,
        fontWeight: '700',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 12,
    },
    timeRowText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },

    // ── Price ──
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        borderRadius: 20,
        marginBottom: 16,
    },
    priceBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    priceCenter: {
        alignItems: 'center',
    },
    priceInput: {
        fontSize: 32,
        fontWeight: '800',
        minWidth: 80,
    },
    priceCurrency: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: -4,
    },

    // ── Final confirm ──
    finalConfirmBtn: {
        flexDirection: 'row',
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    finalConfirmText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },

    // ── Time picker modal ──
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    timeModal: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
    },
    timeModalTitle: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 20,
    },
    timeModalInput: {
        fontSize: 28,
        fontWeight: '700',
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    timePresetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    timePresetChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    timePresetText: {
        fontSize: 14,
        fontWeight: '700',
    },
    timeConfirmBtn: {
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeConfirmText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
