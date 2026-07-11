import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Modal, Animated, Dimensions, Platform } from 'react-native';
import { X, MapPin, Search, Home, Briefcase, Dumbbell, GraduationCap, Star, Crosshair } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { RouteService } from '../../services/RouteService';
import { usePlacesStore } from '../../store/usePlacesStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocationResult {
    label: string;
    latitude: number;
    longitude: number;
    isSavedPlace?: boolean;
    icon?: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelectLocation: (location: LocationResult) => void;
    onChooseOnMap: () => void;
    placeholder?: string;
    theme: any;
    isDark: boolean;
    initialQuery?: string;
    pickupAddress?: string; // Added to show the From/To UI
}

export default function LocationSearchBottomSheet({
    visible,
    onClose,
    onSelectLocation,
    onChooseOnMap,
    placeholder = 'Search destination...',
    theme,
    isDark,
    initialQuery = '',
    pickupAddress
}: Props) {
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { places } = usePlacesStore();

    // Animation
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                mass: 1,
                stiffness: 100,
            }).start();
            setSearchQuery(initialQuery);
        } else {
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, initialQuery]);

    const handleSearch = useCallback((text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (text.trim().length > 0) {
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

    useEffect(() => {
        if (visible && searchQuery === '') {
            const savedResults = places.map(p => ({
                label: `${p.label} - ${p.address}`,
                latitude: p.latitude,
                longitude: p.longitude,
                isSavedPlace: true,
                icon: p.icon
            }));
            setSearchResults(savedResults);
        }
    }, [visible, places, searchQuery]);

    const handleClose = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            onClose();
            setSearchQuery('');
        });
    };

    if (!visible && translateY.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) as unknown as number === SCREEN_HEIGHT) return null;

    const surfaceBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
                
                <Animated.View 
                    style={[
                        styles.sheetContainer, 
                        { 
                            backgroundColor: surfaceBg,
                            transform: [{ translateY }],
                            paddingTop: Platform.OS === 'ios' ? 12 : 24,
                            paddingBottom: insets.bottom || 24
                        }
                    ]}
                >
                    <View style={styles.handleBar} />
                    
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Set your route</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {pickupAddress ? (
                        <View style={styles.routeInputsWrap}>
                            {/* FROM */}
                            <View style={[styles.routeInputRow, { backgroundColor: inputBg }]}>
                                <View style={[styles.routeInputDot, { backgroundColor: '#10B981' }]} />
                                <View style={styles.routeInputContent}>
                                    <Text style={[styles.routeInputLabel, { color: isDark ? '#8E8E93' : '#6B7280' }]}>From</Text>
                                    <Text style={[styles.routeInputValue, { color: theme.text }]} numberOfLines={1}>
                                        {pickupAddress}
                                    </Text>
                                </View>
                            </View>

                            {/* Connector */}
                            <View style={styles.routeConnector}>
                                <View style={[styles.connectorLine, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />
                            </View>

                            {/* TO */}
                            <View style={[styles.routeInputRow, styles.routeInputActive, { backgroundColor: inputBg, borderColor: theme.primary + '60' }]}>
                                <View style={[styles.routeInputDot, { backgroundColor: '#FF3B30' }]} />
                                <View style={styles.routeInputContent}>
                                    <Text style={[styles.routeInputLabel, { color: isDark ? '#8E8E93' : '#6B7280' }]}>To</Text>
                                    <TextInput
                                        style={[styles.routeSearchInput, { color: theme.text }]}
                                        placeholder={placeholder}
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
                    ) : (
                        <View style={[styles.searchInputContainer, { backgroundColor: inputBg }]}>
                            <Search size={20} color={theme.icon || '#888'} style={styles.searchIcon} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.text }]}
                                placeholder={placeholder}
                                placeholderTextColor={isDark ? '#8E8E93' : '#8E8E93'}
                                value={searchQuery}
                                onChangeText={handleSearch}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                                    <X size={18} color={theme.icon || '#888'} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <TouchableOpacity 
                        style={styles.chooseOnMapBtn} 
                        onPress={() => {
                            handleClose();
                            onChooseOnMap();
                        }}
                    >
                        <View style={[styles.chooseMapIconBg, { backgroundColor: 'rgba(10, 132, 255, 0.1)' }]}>
                            <Crosshair size={18} color="#0A84FF" />
                        </View>
                        <Text style={styles.chooseMapText}>Choose on Map</Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]} />

                    <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
                        {isSearching && (
                            <View style={styles.searchingState}>
                                <ActivityIndicator size="small" color={theme.primary} />
                                <Text style={[styles.searchingText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>Searching...</Text>
                            </View>
                        )}

                        {searchResults.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.resultItem, { borderBottomColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                                onPress={() => {
                                    handleClose();
                                    onSelectLocation(item);
                                }}
                            >
                                <View style={[styles.resultIconBg, { backgroundColor: inputBg }]}>
                                    {item.icon === 'home' ? <Home size={16} color={theme.primary} /> :
                                     item.icon === 'briefcase' ? <Briefcase size={16} color={theme.primary} /> :
                                     item.icon === 'gym' ? <Dumbbell size={16} color={theme.primary} /> :
                                     item.icon === 'graduation-cap' ? <GraduationCap size={16} color={theme.primary} /> :
                                     item.isSavedPlace ? <Star size={16} color={theme.primary} /> :
                                     <MapPin size={16} color={theme.primary} />}
                                </View>
                                <View style={styles.resultTextContainer}>
                                    <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
                                        {item.label.split(',')[0]}
                                    </Text>
                                    <Text style={[styles.resultSubtitle, { color: isDark ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>
                                        {item.label}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheetContainer: {
        width: '100%',
        height: '85%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    handleBar: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#C7C7CC',
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        height: '100%',
    },
    routeInputsWrap: {
        marginBottom: 16,
    },
    routeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    routeInputActive: {
        borderWidth: 1,
    },
    routeInputDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 16,
    },
    routeInputContent: {
        flex: 1,
        justifyContent: 'center',
    },
    routeInputLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    routeInputValue: {
        fontSize: 15,
        fontWeight: '500',
    },
    routeSearchInput: {
        fontSize: 15,
        fontWeight: '500',
        padding: 0,
        margin: 0,
        height: 20,
    },
    routeConnector: {
        marginLeft: 19,
        height: 12,
        justifyContent: 'center',
    },
    connectorLine: {
        width: 2,
        height: 12,
        borderRadius: 1,
    },
    chooseOnMapBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
    },
    chooseMapIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    chooseMapText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0A84FF',
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 8,
    },
    resultsList: {
        flex: 1,
    },
    searchingState: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    searchingText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    resultIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    resultTextContainer: {
        flex: 1,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    resultSubtitle: {
        fontSize: 13,
    }
});
