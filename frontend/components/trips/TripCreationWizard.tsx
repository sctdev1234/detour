import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    Modal,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import {
    MapPin,
    Navigation,
    Clock,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    Search,
    X,
    Plus,
    Minus,
    Check,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LatLng } from '../../types';
import { RouteService } from '../../services/RouteService';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_PRESETS = ['07:00', '07:30', '08:00', '08:30', '09:00', '17:00', '17:30', '18:00'];

type Step = 'destination' | 'pickup' | 'schedule' | 'confirm';
const STEPS: Step[] = ['destination', 'pickup', 'schedule', 'confirm'];

type Props = {
    theme: any;
    colorScheme: 'light' | 'dark';
    currentLocation: LatLng | null;
    currentAddress: string;
    onPointsChange: (points: LatLng[]) => void;
    onCancel: () => void;
    onConfirm: (data: {
        startPoint: LatLng;
        endPoint: LatLng;
        days: string[];
        timeStart: string;
        price: number;
    }) => Promise<void>;
    isSubmitting?: boolean;
};

export default function TripCreationWizard({
    theme,
    colorScheme,
    currentLocation,
    currentAddress,
    onPointsChange,
    onCancel,
    onConfirm,
    isSubmitting = false,
}: Props) {
    const [step, setStep] = useState<Step>('destination');
    const stepIndex = STEPS.indexOf(step);

    // Location state
    const [destination, setDestination] = useState<LatLng | null>(null);
    const [destAddress, setDestAddress] = useState('');
    const [pickup, setPickup] = useState<LatLng | null>(currentLocation);
    const [pickupAddress, setPickupAddress] = useState(currentAddress || 'Current Location');

    // Schedule state
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [timeStart, setTimeStart] = useState('08:00');
    const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);

    // Price state
    const [price, setPrice] = useState('15');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<{ label: string; latitude: number; longitude: number }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

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
        const point: LatLng = { latitude: suggestion.latitude, longitude: suggestion.longitude };

        if (step === 'destination') {
            setDestination(point);
            setDestAddress(suggestion.label);
            // Update map
            if (pickup) {
                onPointsChange([pickup, point]);
            } else if (currentLocation) {
                setPickup(currentLocation);
                setPickupAddress(currentAddress);
                onPointsChange([currentLocation, point]);
            }
        } else if (step === 'pickup') {
            setPickup(point);
            setPickupAddress(suggestion.label);
            if (destination) {
                onPointsChange([point, destination]);
            }
        }

        setIsSearchOpen(false);
        setSearchQuery('');
        setSuggestions([]);
    };

    const goNext = () => {
        const idx = STEPS.indexOf(step);
        if (idx < STEPS.length - 1) {
            setStep(STEPS[idx + 1]);
        }
    };

    const goBack = () => {
        const idx = STEPS.indexOf(step);
        if (idx > 0) {
            setStep(STEPS[idx - 1]);
        } else {
            onCancel();
        }
    };

    const handleConfirm = async () => {
        if (!pickup || !destination) return;
        await onConfirm({
            startPoint: { ...pickup, address: pickupAddress },
            endPoint: { ...destination, address: destAddress },
            days: selectedDays,
            timeStart,
            price: parseFloat(price) || 0,
        });
    };

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const selectWeekdays = () => {
        setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    };

    const canProceed = (): boolean => {
        switch (step) {
            case 'destination': return !!destination;
            case 'pickup': return !!pickup;
            case 'schedule': return selectedDays.length > 0 && !!timeStart;
            case 'confirm': return !!price && parseFloat(price) > 0;
            default: return false;
        }
    };

    const isDark = colorScheme === 'dark';
    const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)';
    const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';

    const renderStepContent = () => {
        switch (step) {
            case 'destination':
                return (
                    <Animated.View entering={FadeInRight.duration(300)} key="step-dest">
                        <Text style={[styles.stepTitle, { color: theme.text }]}>Where are you going?</Text>
                        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                            Search for your destination
                        </Text>

                        <TouchableOpacity
                            style={[styles.locationInput, { backgroundColor: inputBg }]}
                            onPress={() => setIsSearchOpen(true)}
                            activeOpacity={0.8}
                        >
                            <MapPin size={20} color={theme.primary} />
                            <Text
                                style={[
                                    styles.locationInputText,
                                    { color: destAddress ? theme.text : theme.textSecondary }
                                ]}
                                numberOfLines={1}
                            >
                                {destAddress || 'Search destination...'}
                            </Text>
                            <Search size={18} color={theme.icon} />
                        </TouchableOpacity>

                        {destAddress ? (
                            <View style={[styles.selectedLocationCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
                                <Check size={18} color={theme.primary} />
                                <Text style={[styles.selectedLocationText, { color: theme.primary }]} numberOfLines={2}>
                                    {destAddress}
                                </Text>
                            </View>
                        ) : null}
                    </Animated.View>
                );

            case 'pickup':
                return (
                    <Animated.View entering={FadeInRight.duration(300)} key="step-pickup">
                        <Text style={[styles.stepTitle, { color: theme.text }]}>Where from?</Text>
                        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                            Your pickup location
                        </Text>

                        <TouchableOpacity
                            style={[styles.locationInput, { backgroundColor: inputBg }]}
                            onPress={() => setIsSearchOpen(true)}
                            activeOpacity={0.8}
                        >
                            <Navigation size={20} color={'#10B981'} />
                            <Text
                                style={[styles.locationInputText, { color: theme.text }]}
                                numberOfLines={1}
                            >
                                {pickupAddress || 'Current Location'}
                            </Text>
                            <Search size={18} color={theme.icon} />
                        </TouchableOpacity>

                        <View style={[styles.selectedLocationCard, { backgroundColor: '#10B981' + '10', borderColor: '#10B981' + '30' }]}>
                            <Navigation size={18} color={'#10B981'} />
                            <Text style={[styles.selectedLocationText, { color: '#10B981' }]} numberOfLines={2}>
                                {pickupAddress || 'Using current location'}
                            </Text>
                        </View>
                    </Animated.View>
                );

            case 'schedule':
                return (
                    <Animated.View entering={FadeInRight.duration(300)} key="step-schedule">
                        <Text style={[styles.stepTitle, { color: theme.text }]}>When do you travel?</Text>
                        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                            Select your commute days
                        </Text>

                        {/* Quick select weekdays */}
                        <TouchableOpacity
                            style={[styles.quickSelectBtn, { backgroundColor: theme.primary + '10' }]}
                            onPress={selectWeekdays}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.quickSelectText, { color: theme.primary }]}>Mon - Fri (Weekdays)</Text>
                        </TouchableOpacity>

                        {/* Day pills */}
                        <View style={styles.daysGrid}>
                            {DAYS.map(day => {
                                const isSelected = selectedDays.includes(day);
                                return (
                                    <TouchableOpacity
                                        key={day}
                                        style={[
                                            styles.dayPill,
                                            {
                                                backgroundColor: isSelected ? theme.primary : inputBg,
                                                borderColor: isSelected ? theme.primary : 'transparent',
                                            }
                                        ]}
                                        onPress={() => toggleDay(day)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.dayPillText,
                                            { color: isSelected ? '#FFFFFF' : theme.text }
                                        ]}>
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Time selector */}
                        <TouchableOpacity
                            style={[styles.timeButton, { backgroundColor: inputBg }]}
                            onPress={() => setIsTimePickerVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Clock size={20} color={theme.primary} />
                            <Text style={[styles.timeButtonText, { color: theme.text }]}>
                                Departure at {timeStart}
                            </Text>
                            <ChevronRight size={18} color={theme.icon} />
                        </TouchableOpacity>
                    </Animated.View>
                );

            case 'confirm':
                return (
                    <Animated.View entering={FadeInRight.duration(300)} key="step-confirm">
                        <Text style={[styles.stepTitle, { color: theme.text }]}>Set your price</Text>
                        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                            How much are you willing to pay per trip?
                        </Text>

                        {/* Price adjuster */}
                        <View style={[styles.priceContainer, { backgroundColor: inputBg }]}>
                            <TouchableOpacity
                                style={[styles.priceBtn, { backgroundColor: isDark ? '#3A3A3C' : '#FFFFFF' }]}
                                onPress={() => setPrice(String(Math.max(5, (parseFloat(price) || 0) - 5)))}
                                activeOpacity={0.7}
                            >
                                <Minus size={22} color={theme.text} />
                            </TouchableOpacity>

                            <View style={styles.priceDisplay}>
                                <TextInput
                                    style={[styles.priceInput, { color: theme.text }]}
                                    value={price}
                                    onChangeText={setPrice}
                                    keyboardType="numeric"
                                    textAlign="center"
                                />
                                <Text style={[styles.priceCurrency, { color: theme.textSecondary }]}>MAD</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.priceBtn, { backgroundColor: isDark ? '#3A3A3C' : '#FFFFFF' }]}
                                onPress={() => setPrice(String((parseFloat(price) || 0) + 5))}
                                activeOpacity={0.7}
                            >
                                <Plus size={22} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Trip summary */}
                        <View style={[styles.summaryCard, { backgroundColor: inputBg }]}>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>From</Text>
                                <Text style={[styles.summaryValue, { color: theme.text }]} numberOfLines={1}>{pickupAddress}</Text>
                            </View>
                            <View style={[styles.summaryDivider, { backgroundColor: theme.border + '40' }]} />
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>To</Text>
                                <Text style={[styles.summaryValue, { color: theme.text }]} numberOfLines={1}>{destAddress}</Text>
                            </View>
                            <View style={[styles.summaryDivider, { backgroundColor: theme.border + '40' }]} />
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Schedule</Text>
                                <Text style={[styles.summaryValue, { color: theme.text }]}>{selectedDays.join(', ')} • {timeStart}</Text>
                            </View>
                        </View>
                    </Animated.View>
                );
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <BlurView
                intensity={80}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.sheet, { backgroundColor: cardBg }]}
            >
                <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />

                {/* Progress indicator */}
                <View style={styles.progressContainer}>
                    {STEPS.map((s, i) => (
                        <View
                            key={s}
                            style={[
                                styles.progressDot,
                                {
                                    backgroundColor: i <= stepIndex ? theme.primary : (isDark ? '#3A3A3C' : '#E5E5EA'),
                                    width: i === stepIndex ? 24 : 8,
                                }
                            ]}
                        />
                    ))}
                </View>

                {/* Step content */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollContent}
                >
                    {renderStepContent()}
                </ScrollView>

                {/* Navigation buttons */}
                <View style={styles.navRow}>
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: inputBg }]}
                        onPress={goBack}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={20} color={theme.text} />
                    </TouchableOpacity>

                    {step === 'confirm' ? (
                        <TouchableOpacity
                            style={[
                                styles.nextBtn,
                                { backgroundColor: canProceed() ? theme.primary : theme.primary + '40' }
                            ]}
                            onPress={handleConfirm}
                            disabled={!canProceed() || isSubmitting}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Check size={20} color="#FFF" />
                                    <Text style={styles.nextBtnText}>Confirm Trip</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.nextBtn,
                                { backgroundColor: canProceed() ? theme.primary : theme.primary + '40' }
                            ]}
                            onPress={goNext}
                            disabled={!canProceed()}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.nextBtnText}>Continue</Text>
                            <ChevronRight size={20} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>
            </BlurView>

            {/* Search overlay modal */}
            {isSearchOpen && (
                <Modal visible transparent animationType="slide" onRequestClose={() => setIsSearchOpen(false)}>
                    <View style={[styles.searchModal, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                        <View style={[styles.searchHeader, { borderBottomColor: theme.border + '30' }]}>
                            <TouchableOpacity onPress={() => { setIsSearchOpen(false); setSearchQuery(''); setSuggestions([]); }}>
                                <ChevronLeft size={24} color={theme.text} />
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.searchInput, { color: theme.text }]}
                                placeholder={step === 'destination' ? 'Search destination...' : 'Search pickup location...'}
                                placeholderTextColor={theme.textSecondary + '80'}
                                value={searchQuery}
                                onChangeText={handleSearch}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => { setSearchQuery(''); setSuggestions([]); }}>
                                    <X size={20} color={theme.icon} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled" style={styles.searchResults}>
                            {isSearching && (
                                <View style={styles.searchLoader}>
                                    <ActivityIndicator size="small" color={theme.primary} />
                                </View>
                            )}
                            {suggestions.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.searchItem, { borderBottomColor: theme.border + '20' }]}
                                    onPress={() => handleSelectSuggestion(item)}
                                    activeOpacity={0.7}
                                >
                                    <MapPin size={18} color={theme.primary} />
                                    <Text style={[styles.searchItemText, { color: theme.text }]} numberOfLines={2}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </Modal>
            )}

            {/* Time picker modal */}
            <Modal visible={isTimePickerVisible} transparent animationType="fade" onRequestClose={() => setIsTimePickerVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.timeModal, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                        <Text style={[styles.timeModalTitle, { color: theme.text }]}>Departure Time</Text>

                        <TextInput
                            style={[styles.timeInput, { color: theme.text, backgroundColor: inputBg }]}
                            value={timeStart}
                            onChangeText={setTimeStart}
                            placeholder="e.g. 08:30"
                            placeholderTextColor={theme.textSecondary + '70'}
                            maxLength={5}
                            textAlign="center"
                        />

                        <View style={styles.timePresetsRow}>
                            {TIME_PRESETS.map(preset => (
                                <TouchableOpacity
                                    key={preset}
                                    style={[
                                        styles.timePreset,
                                        {
                                            backgroundColor: timeStart === preset ? theme.primary : inputBg,
                                        }
                                    ]}
                                    onPress={() => setTimeStart(preset)}
                                >
                                    <Text style={[
                                        styles.timePresetText,
                                        { color: timeStart === preset ? '#FFFFFF' : theme.text }
                                    ]}>
                                        {preset}
                                    </Text>
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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        maxHeight: '65%',
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 20,
    },
    progressDot: {
        height: 8,
        borderRadius: 4,
    },
    scrollContent: {
        paddingBottom: 16,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    stepSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 20,
    },
    locationInput: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 12,
    },
    locationInputText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    selectedLocationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    selectedLocationText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    quickSelectBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    quickSelectText: {
        fontSize: 14,
        fontWeight: '700',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    dayPill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    dayPillText: {
        fontSize: 14,
        fontWeight: '700',
    },
    timeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 12,
    },
    timeButtonText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        borderRadius: 20,
        marginBottom: 20,
    },
    priceBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    priceDisplay: {
        alignItems: 'center',
    },
    priceInput: {
        fontSize: 36,
        fontWeight: '800',
        minWidth: 100,
    },
    priceCurrency: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: -4,
    },
    summaryCard: {
        borderRadius: 16,
        padding: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    summaryLabel: {
        fontSize: 13,
        fontWeight: '600',
        width: 70,
    },
    summaryValue: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'right',
    },
    summaryDivider: {
        height: 1,
    },
    navRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextBtn: {
        flex: 1,
        height: 48,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    nextBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    // Search modal
    searchModal: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 8,
    },
    searchResults: {
        flex: 1,
    },
    searchLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    searchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 14,
        borderBottomWidth: 1,
    },
    searchItemText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 22,
    },
    // Time picker modal
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
    timeInput: {
        fontSize: 28,
        fontWeight: '700',
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    timePresetsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    timePreset: {
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
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
