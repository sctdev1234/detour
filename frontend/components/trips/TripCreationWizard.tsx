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
    Keyboard,
    LayoutAnimation,
    UIManager,
    KeyboardAvoidingView
} from 'react-native';
import {
    MapPin,
    Clock,
    ChevronLeft,
    ChevronRight,
    X,
    Plus,
    Minus,
    Navigation,
    LocateFixed,
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
import { useNetInfo } from '@react-native-community/netinfo';
import { usePlacesStore } from '../../store/usePlacesStore';
import * as Location from 'expo-location';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_PRESETS = ['07:00', '07:30', '08:00', '08:30', '09:00', '17:00', '17:30', '18:00'];

type Step = 'pickup' | 'destination_search' | 'destination_map' | 'schedule';

interface LocationResult {
    label: string;
    latitude: number;
    longitude: number;
    isSavedPlace?: boolean;
    icon?: string;
}

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
    mapCenter?: LatLng | null;
    isMapDragging?: boolean;
    mapRef?: any;
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
    mapCenter,
    isMapDragging = false,
    mapRef
}: Props) {
    const insets = useSafeAreaInsets();
    const isDark = colorScheme === 'dark';
    const netInfo = useNetInfo();
    const { places } = usePlacesStore();

    const [step, setStep] = useState<Step>('pickup');

    const [pickup, setPickup] = useState<LatLng | null>(currentLocation);
    const [pickupAddress, setPickupAddress] = useState(
        currentAddress && currentAddress !== 'Current Location' ? currentAddress : ''
    );
    const [destination, setDestination] = useState<LatLng | null>(null);
    const [destAddress, setDestAddress] = useState('');

    const [centerAddress, setCenterAddress] = useState(
        currentAddress && currentAddress !== 'Current Location' ? currentAddress : ''
    );
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Schedule State
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [timeStart, setTimeStart] = useState('08:00');
    const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
    const [price, setPrice] = useState('15');
    const [rideType, setRideType] = useState<'immediate' | 'scheduled'>('immediate');

    const pinTranslateY = useRef(new Animated.Value(0)).current;
    const pinScale = useRef(new Animated.Value(1)).current;
    
    const reverseGeocodeAbortControllerRef = useRef<AbortController | null>(null);
    const geocodeAbortControllerRef = useRef<AbortController | null>(null);

    const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';
    const surfaceBg = isDark ? '#1C1C1E' : '#FFFFFF';

    // Clean up abort controllers on unmount
    useEffect(() => {
        return () => {
            if (reverseGeocodeAbortControllerRef.current) {
                reverseGeocodeAbortControllerRef.current.abort();
            }
            if (geocodeAbortControllerRef.current) {
                geocodeAbortControllerRef.current.abort();
            }
        };
    }, []);

    // Fetch GPS accuracy when map settles on pickup
    useEffect(() => {
        if (step === 'pickup' && !isMapDragging) {
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                .then(loc => setGpsAccuracy(Math.round(loc.coords.accuracy || 0)))
                .catch(() => setGpsAccuracy(null));
        }
    }, [isMapDragging, step]);

    // Animate map pin when dragging
    useEffect(() => {
        if (step !== 'pickup' && step !== 'destination_map') return;

        if (isMapDragging) {
            if (reverseGeocodeAbortControllerRef.current) {
                reverseGeocodeAbortControllerRef.current.abort();
                reverseGeocodeAbortControllerRef.current = null;
            }
            Animated.parallel([
                Animated.spring(pinTranslateY, { toValue: -15, useNativeDriver: true, damping: 15, mass: 0.8, stiffness: 200 }),
                Animated.spring(pinScale, { toValue: 1.1, useNativeDriver: true, damping: 15, mass: 0.8, stiffness: 200 })
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(pinTranslateY, { toValue: 0, useNativeDriver: true, damping: 12, mass: 0.6, stiffness: 180 }),
                Animated.spring(pinScale, { toValue: 1, useNativeDriver: true, damping: 12, mass: 0.6, stiffness: 180 })
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
                            setCenterAddress(`${mapCenter.latitude.toFixed(4)}, ${mapCenter.longitude.toFixed(4)}`);
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
    }, [isMapDragging, step, mapCenter]);

    // Handle LayoutAnimations for smooth height changes
    useEffect(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (step !== 'destination_search') {
            Keyboard.dismiss();
        }
    }, [step]);

    // Draw route when reaching schedule step
    useEffect(() => {
        if (step === 'schedule' && pickup && destination && mapRef?.current) {
            onPointsChange([pickup, destination]);
            setTimeout(() => {
                mapRef.current?.fitToCoordinates([pickup, destination], {
                    edgePadding: { top: 120, right: 60, bottom: SCREEN_HEIGHT * 0.5, left: 60 },
                    animated: true,
                });
            }, 400);
        } else {
            if (mapPoints.length > 0) onPointsChange([]); // Clear route when going back
        }
    }, [step, pickup, destination, mapRef]);

    const handleSearch = useCallback((text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (geocodeAbortControllerRef.current) {
            geocodeAbortControllerRef.current.abort();
            geocodeAbortControllerRef.current = null;
        }

        if (text.trim().length > 0) {
            const matchedPlaces = places
                .filter(p => p.label.toLowerCase().includes(text.toLowerCase()) || p.address.toLowerCase().includes(text.toLowerCase()))
                .map(p => ({ label: `${p.label} - ${p.address}`, latitude: p.latitude, longitude: p.longitude, isSavedPlace: true, icon: p.icon }));

            if (text.trim().length > 2) {
                searchTimeout.current = setTimeout(async () => {
                    const controller = new AbortController();
                    geocodeAbortControllerRef.current = controller;
                    setIsSearching(true);
                    try {
                        const results = await RouteService.geocode(text, controller.signal);
                        setSearchResults([...matchedPlaces, ...results]);
                    } catch (err: any) {
                        if (err.name !== 'AbortError') {
                            setSearchResults(matchedPlaces);
                        }
                    } finally {
                        if (geocodeAbortControllerRef.current === controller) {
                            setIsSearching(false);
                            geocodeAbortControllerRef.current = null;
                        }
                    }
                }, 400);
            } else {
                setSearchResults(matchedPlaces);
            }
        } else {
            setSearchResults([]);
        }
    }, [places]);

    const selectSearchResult = useCallback((item: LocationResult) => {
        setDestination({ latitude: item.latitude, longitude: item.longitude });
        setDestAddress(item.label);
        setStep('schedule');
    }, []);

    const confirmMapLocation = useCallback(() => {
        if (!mapCenter) return;
        if (step === 'pickup') {
            setPickup(mapCenter);
            setPickupAddress(centerAddress);
            setStep('destination_search');
        } else if (step === 'destination_map') {
            setDestination(mapCenter);
            setDestAddress(centerAddress);
            setStep('schedule');
        }
    }, [mapCenter, centerAddress, step]);

    const goBack = useCallback(() => {
        switch (step) {
            case 'pickup':
                onCancel();
                break;
            case 'destination_search':
                setStep('pickup');
                break;
            case 'destination_map':
                setStep('destination_search');
                break;
            case 'schedule':
                setStep('destination_search');
                break;
        }
    }, [step, onCancel]);

    const parseAddress = (fullAddress: string) => {
        if (!fullAddress) return { title: '', subtitle: '' };
        const parts = fullAddress.split(",");
        return {
            title: parts[0],
            subtitle: parts.slice(1).join(",").trim() || 'Morocco'
        };
    };

    const getHeaderTitle = () => {
        switch (step) {
            case 'pickup': return 'Where are you starting?';
            case 'destination_search': return 'Where are you going?';
            case 'destination_map': return 'Choose destination';
            case 'schedule': return 'Review your trip';
        }
    };

    const renderCenterPin = () => {
        if (step !== 'pickup' && step !== 'destination_map') return null;
        
        const pinColor = step === 'destination_map' ? '#FF3B30' : '#10B981';
        
        return (
            <View style={styles.centerPinWrapper} pointerEvents="none">
                <Animated.View style={[
                    styles.centerPinContainer,
                    { transform: [{ translateY: pinTranslateY }, { scale: pinScale }] }
                ]}>
                    <View style={[styles.centerPinBubble, { backgroundColor: pinColor }]}>
                        <View style={styles.pinInnerDot} />
                    </View>
                    <View style={[styles.pinNeedle, { backgroundColor: pinColor }]} />
                </Animated.View>
                <View style={styles.pinGroundShadow} />
            </View>
        );
    };

    const renderSuggestedPlaces = () => {
        if (step !== 'destination_search') return null;
        
        // Show default suggestions if search is empty
        const data = searchQuery.trim().length > 0 ? searchResults : places.map(p => ({
            label: p.label,
            latitude: p.latitude,
            longitude: p.longitude,
            isSavedPlace: true,
            icon: p.icon
        }));

        return (
            <View style={styles.suggestionsContainer}>
                {searchQuery.trim().length === 0 && (
                    <TouchableOpacity style={styles.chooseMapRow} onPress={() => setStep('destination_map')}>
                        <View style={styles.chooseMapIconBg}>
                            <Crosshair size={20} color="#0A84FF" />
                        </View>
                        <View style={styles.chooseMapTextWrap}>
                            <Text style={styles.chooseMapTitle}>Choose location on map</Text>
                            <Text style={styles.chooseMapSubtitle}>Drag the map to select an exact point</Text>
                        </View>
                        <ChevronRight size={20} color={theme.icon || '#888'} />
                    </TouchableOpacity>
                )}

                <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
                    {isSearching && (
                        <View style={styles.searchingState}>
                            <ActivityIndicator size="small" color={theme.primary} />
                            <Text style={[styles.searchingText, { color: theme.textSecondary || '#888' }]}>Searching...</Text>
                        </View>
                    )}

                    {data.map((item, index) => {
                        const iconColor = item.isSavedPlace ? theme.primary : (theme.icon || '#888');
                        const Icon = item.icon === 'home' ? Home :
                                     item.icon === 'briefcase' ? Briefcase :
                                     item.icon === 'gym' ? Dumbbell :
                                     item.icon === 'graduation-cap' ? GraduationCap :
                                     item.isSavedPlace ? Star : MapPin;

                        return (
                            <TouchableOpacity key={index} style={[styles.resultItem, { borderBottomColor: isDark ? '#2C2C2E' : '#F2F2F7' }]} onPress={() => selectSearchResult(item)}>
                                <View style={[styles.resultIconBg, { backgroundColor: inputBg }]}>
                                    <Icon size={18} color={iconColor} />
                                </View>
                                <View style={styles.resultTextWrap}>
                                    <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>{item.label.split(",")[0]}</Text>
                                    <Text style={[styles.resultSubtitle, { color: theme.textSecondary || '#888' }]} numberOfLines={1}>{item.label}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderScheduleOptions = () => {
        if (step !== 'schedule') return null;
        return (
            <ScrollView style={styles.scheduleScroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.rideTypeToggle, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                    <TouchableOpacity style={[styles.rideTypeBtn, rideType === 'immediate' && [styles.rideTypeBtnActive, { backgroundColor: theme.primary }]]} onPress={() => setRideType('immediate')}>
                        <Navigation size={16} color={rideType === 'immediate' ? '#FFF' : theme.icon} />
                        <Text style={[styles.rideTypeText, { color: rideType === 'immediate' ? '#FFF' : theme.text }]}>Ride Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rideTypeBtn, rideType === 'scheduled' && [styles.rideTypeBtnActive, { backgroundColor: theme.primary }]]} onPress={() => setRideType('scheduled')}>
                        <Clock size={16} color={rideType === 'scheduled' ? '#FFF' : theme.icon} />
                        <Text style={[styles.rideTypeText, { color: rideType === 'scheduled' ? '#FFF' : theme.text }]}>Schedule</Text>
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
                                    <TouchableOpacity key={day} style={[styles.dayChip, { backgroundColor: inputBg }, isSelected && { backgroundColor: theme.primary + '15', borderColor: theme.primary, borderWidth: 1 }]} onPress={() => toggleDay(day)}>
                                        <Text style={[styles.dayChipText, { color: isSelected ? theme.primary : (theme.textSecondary || '#888') }]}>{day}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity style={[styles.timePickerBtn, { backgroundColor: inputBg }]} onPress={() => setIsTimePickerVisible(true)}>
                            <Text style={[styles.timeLabel, { color: theme.textSecondary || '#888' }]}>Departure Time</Text>
                            <Text style={[styles.timeValue, { color: theme.text }]}>{timeStart}</Text>
                            <ChevronRight size={18} color={theme.icon || '#888'} />
                        </TouchableOpacity>
                    </>
                )}

                <Text style={[styles.sectionLabel, { color: theme.text, marginTop: 12 }]}>Your price per trip</Text>
                <View style={[styles.priceRow, { backgroundColor: inputBg }]}>
                    <TouchableOpacity style={[styles.priceBtn, { backgroundColor: isDark ? '#3A3A3C' : '#FFF' }]} onPress={() => setPrice(String(Math.max(5, (parseFloat(price) || 0) - 5)))}>
                        <Minus size={20} color={theme.text} />
                    </TouchableOpacity>
                    <View style={styles.priceCenter}>
                        <TextInput style={[styles.priceInput, { color: theme.text }]} value={price} onChangeText={setPrice} keyboardType="numeric" textAlign="center" />
                        <Text style={[styles.priceCurrency, { color: theme.textSecondary || '#888' }]}>MAD</Text>
                    </View>
                    <TouchableOpacity style={[styles.priceBtn, { backgroundColor: isDark ? '#3A3A3C' : '#FFF' }]} onPress={() => setPrice(String((parseFloat(price) || 0) + 5))}>
                        <Plus size={20} color={theme.text} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    };

    const toggleDay = (day: string) => {
        setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const handleFinalConfirm = async () => {
        if (!pickup || !destination) return;
        await onConfirm({
            startPoint: pickup,
            endPoint: destination,
            days: rideType === 'scheduled' ? selectedDays : [],
            timeStart: rideType === 'scheduled' ? timeStart : new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            price: Number(price),
            rideType
        });
    };

    // Determine current dynamic address strings
    const currentPickupText = step === 'pickup' ? (isMapDragging ? 'Moving map...' : (isResolvingAddress ? 'Searching address...' : centerAddress)) : pickupAddress;
    const currentDestText = step === 'destination_map' ? (isMapDragging ? 'Moving map...' : (isResolvingAddress ? 'Searching address...' : centerAddress)) : destAddress;

    const { title: pickupTitle, subtitle: pickupSub } = parseAddress(currentPickupText);
    const { title: destTitle, subtitle: destSub } = parseAddress(currentDestText);

    // Button states
    let btnText = 'Continue';
    let btnAction = confirmMapLocation;
    let btnDisabled = isMapDragging || !mapCenter;

    if (step === 'pickup') {
        btnText = 'Confirm Pickup';
    } else if (step === 'destination_map') {
        btnText = 'Confirm Destination';
    } else if (step === 'destination_search') {
        btnText = 'Select a destination';
        btnDisabled = true;
    } else if (step === 'schedule') {
        btnText = rideType === 'immediate' ? 'Choose Ride' : 'Confirm Schedule';
        btnAction = handleFinalConfirm;
        btnDisabled = !price || parseFloat(price) <= 0 || (rideType === 'scheduled' && (selectedDays.length === 0 || !timeStart));
    }

    // Determine Target Heights explicitly for LayoutAnimation to interpolate between
    let currentSheetHeight: any = '45%';
    if (step === 'destination_search') currentSheetHeight = '85%';
    else if (step === 'schedule') currentSheetHeight = '65%';

    return (
        <KeyboardAvoidingView style={styles.fullScreen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
            {renderCenterPin()}

            <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.topGradient} pointerEvents="none" />

            <TouchableOpacity style={[styles.mapBackBtn, { top: insets.top + 10 }]} onPress={goBack} activeOpacity={0.8}>
                <BlurView intensity={80} tint="dark" style={styles.mapBackBtnBlur}>
                    <ChevronLeft size={22} color="#FFF" />
                </BlurView>
            </TouchableOpacity>

            {(step === 'pickup' || step === 'destination_map') && (
                <TouchableOpacity
                    style={[styles.recenterBtn, { bottom: SCREEN_HEIGHT * 0.45 + 20 }]}
                    onPress={() => {
                        if (currentLocation && mapRef?.current) {
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
                    <LocateFixed size={20} color="#4F46E5" />
                </TouchableOpacity>
            )}

            <View style={[styles.bottomSheetWrapper, { height: currentSheetHeight }]}>
                <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={[styles.sheetInner, { backgroundColor: cardBg }]}>
                    <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />

                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>{getHeaderTitle()}</Text>
                    </View>

                    {/* Unified Journey Connector Card */}
                    <View style={styles.journeyCard}>
                        {/* Origin */}
                        <View style={styles.journeyRow}>
                            <View style={styles.indicatorWrap}>
                                <View style={[styles.indicatorDot, { backgroundColor: '#10B981' }]} />
                            </View>
                            <View style={styles.journeyContent}>
                                {step === 'pickup' ? (
                                    <View>
                                        <Text style={[styles.journeyMainText, { color: theme.text }]} numberOfLines={1}>{pickupTitle || 'Move map to select'}</Text>
                                        {pickupSub ? <Text style={[styles.journeySubText, { color: theme.textSecondary || '#888' }]} numberOfLines={1}>{pickupSub}</Text> : null}
                                        {gpsAccuracy && !isMapDragging && !isResolvingAddress && (
                                            <Text style={[styles.journeyMeta, { color: '#10B981' }]}>Accuracy: {gpsAccuracy} m</Text>
                                        )}
                                    </View>
                                ) : (
                                    <TouchableOpacity style={[styles.collapsedInput, { backgroundColor: inputBg }]} onPress={() => setStep('pickup')}>
                                        <Text style={[styles.collapsedInputText, { color: theme.text }]} numberOfLines={1}>{pickupTitle}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={[styles.journeyConnector, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA', opacity: step === 'pickup' ? 0.3 : 1 }]} />

                        {/* Destination */}
                        <View style={styles.journeyRow}>
                            <View style={styles.indicatorWrap}>
                                <View style={[styles.indicatorDot, { backgroundColor: step === 'pickup' ? (isDark ? '#3A3A3C' : '#D1D5DB') : '#FF3B30' }]} />
                            </View>
                            <View style={styles.journeyContent}>
                                {step === 'destination_search' ? (
                                    <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: theme.primary, borderWidth: 1 }]}>
                                        <TextInput
                                            style={[styles.searchInput, { color: theme.text }]}
                                            placeholder="Search destination..."
                                            placeholderTextColor={isDark ? '#636366' : '#9CA3AF'}
                                            value={searchQuery}
                                            onChangeText={handleSearch}
                                            autoFocus
                                        />
                                        {searchQuery.length > 0 && (
                                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                <X size={18} color={theme.icon || '#888'} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : step === 'destination_map' ? (
                                    <View>
                                        <Text style={[styles.journeyMainText, { color: theme.text }]} numberOfLines={1}>{destTitle || 'Move map to select'}</Text>
                                        {destSub ? <Text style={[styles.journeySubText, { color: theme.textSecondary || '#888' }]} numberOfLines={1}>{destSub}</Text> : null}
                                    </View>
                                ) : step === 'schedule' ? (
                                    <TouchableOpacity style={[styles.collapsedInput, { backgroundColor: inputBg }]} onPress={() => setStep('destination_search')}>
                                        <Text style={[styles.collapsedInputText, { color: theme.text }]} numberOfLines={1}>{destTitle}</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={[styles.collapsedInput, { backgroundColor: inputBg }]} onPress={() => setStep('destination_search')}>
                                        <Text style={[styles.collapsedInputText, { color: theme.textSecondary || '#888' }]} numberOfLines={1}>Where to?</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Middle Content */}
                    <View style={styles.middleContent}>
                        {renderSuggestedPlaces()}
                        {renderScheduleOptions()}
                    </View>

                    {/* Bottom CTA */}
                    {step !== 'destination_search' && (
                        <TouchableOpacity
                            style={[styles.ctaBtn, { backgroundColor: btnDisabled ? theme.primary + '40' : theme.primary, marginBottom: Platform.OS === 'ios' ? insets.bottom || 16 : 16 }]}
                            onPress={btnAction}
                            disabled={btnDisabled || isSubmitting}
                            activeOpacity={0.85}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.ctaText}>{netInfo.isConnected === false && btnText !== 'Confirm Pickup' && btnText !== 'Confirm Destination' ? 'Offline' : btnText}</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </BlurView>
            </View>

            {/* Time Picker Modal */}
            <Modal visible={isTimePickerVisible} transparent animationType="fade" onRequestClose={() => setIsTimePickerVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.timeModal, { backgroundColor: surfaceBg }]}>
                        <Text style={[styles.timeModalTitle, { color: theme.text }]}>Departure Time</Text>
                        <TextInput style={[styles.timeModalInput, { color: theme.text, backgroundColor: inputBg }]} value={timeStart} onChangeText={setTimeStart} placeholder="e.g. 08:30" placeholderTextColor={isDark ? '#636366' : '#9CA3AF'} maxLength={5} textAlign="center" />
                        <View style={styles.timePresetsGrid}>
                            {TIME_PRESETS.map(preset => (
                                <TouchableOpacity key={preset} style={[styles.timePresetChip, { backgroundColor: timeStart === preset ? theme.primary : inputBg }]} onPress={() => setTimeStart(preset)}>
                                    <Text style={[styles.timePresetText, { color: timeStart === preset ? '#FFF' : theme.text }]}>{preset}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={[styles.timeConfirmBtn, { backgroundColor: theme.primary }]} onPress={() => setIsTimePickerVisible(false)}>
                            <Text style={styles.timeConfirmText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    fullScreen: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
    mapBackBtn: { position: 'absolute', left: 16, zIndex: 20 },
    mapBackBtnBlur: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    recenterBtn: { position: 'absolute', right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, zIndex: 10 },
    
    // Center Pin
    centerPinWrapper: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
    centerPinContainer: { alignItems: 'center', marginTop: -50 },
    centerPinBubble: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    pinInnerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF' },
    pinNeedle: { width: 3, height: 16, borderBottomLeftRadius: 1.5, borderBottomRightRadius: 1.5 },
    pinGroundShadow: { width: 16, height: 5, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 2 },
    
    // Unified Bottom Sheet
    bottomSheetWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%' },
    sheetInner: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    
    header: { marginBottom: 20 },
    headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    
    // Journey Connector
    journeyCard: { marginBottom: 16 },
    journeyRow: { flexDirection: 'row', alignItems: 'flex-start' },
    indicatorWrap: { width: 24, alignItems: 'center', paddingTop: 8 },
    indicatorDot: { width: 10, height: 10, borderRadius: 5 },
    journeyConnector: { width: 2, height: 24, borderRadius: 1, marginLeft: 11, marginVertical: 4 },
    journeyContent: { flex: 1, marginLeft: 12, justifyContent: 'center', minHeight: 40 },
    
    journeyMainText: { fontSize: 18, fontWeight: '700', marginBottom: 2, flexShrink: 1 },
    journeySubText: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
    journeyMeta: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
    
    collapsedInput: { height: 48, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 16 },
    collapsedInputText: { fontSize: 16, fontWeight: '500', flexShrink: 1 },
    
    searchBox: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12, paddingHorizontal: 16 },
    searchInput: { flex: 1, fontSize: 16, fontWeight: '500', height: '100%' },
    
    middleContent: { flex: 1 },
    
    // Suggestions
    suggestionsContainer: { flex: 1, marginTop: 8 },
    chooseMapRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
    chooseMapIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(10, 132, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    chooseMapTextWrap: { flex: 1, flexShrink: 1 },
    chooseMapTitle: { fontSize: 16, fontWeight: '700', color: '#0A84FF', marginBottom: 2 },
    chooseMapSubtitle: { fontSize: 13, color: '#0A84FF', opacity: 0.8 },
    
    resultsList: { flex: 1 },
    searchingState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
    searchingText: { marginLeft: 8, fontSize: 14, fontWeight: '500' },
    resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    resultIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    resultTextWrap: { flex: 1, flexShrink: 1 },
    resultTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    resultSubtitle: { fontSize: 13 },
    
    // Schedule Options
    scheduleScroll: { flex: 1, paddingTop: 10 },
    rideTypeToggle: { flexDirection: 'row', borderRadius: 16, padding: 4, marginBottom: 20 },
    rideTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
    rideTypeBtnActive: { elevation: 2 },
    rideTypeText: { fontSize: 15, fontWeight: '600' },
    daysHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    daysTitle: { fontSize: 16, fontWeight: '700' },
    daysScroll: { marginBottom: 16 },
    daysScrollContent: { gap: 8 },
    dayChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    dayChipText: { fontSize: 14, fontWeight: '700' },
    timePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, marginBottom: 20 },
    timeLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
    timeValue: { fontSize: 16, fontWeight: '700', marginRight: 8 },
    sectionLabel: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 12 },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 20, marginBottom: 24 },
    priceBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    priceCenter: { alignItems: 'center' },
    priceInput: { fontSize: 32, fontWeight: '800', minWidth: 80 },
    priceCurrency: { fontSize: 14, fontWeight: '600', marginTop: -4 },
    
    // Bottom CTA
    ctaBtn: { flexDirection: 'row', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 },
    ctaText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
    
    // Time Modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    timeModal: { width: '100%', borderRadius: 24, padding: 24 },
    timeModalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
    timeModalInput: { fontSize: 28, fontWeight: '700', paddingVertical: 16, borderRadius: 16, marginBottom: 16 },
    timePresetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    timePresetChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    timePresetText: { fontSize: 14, fontWeight: '700' },
    timeConfirmBtn: { height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    timeConfirmText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
