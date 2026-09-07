import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { Briefcase, Clock, Home, MapPin, Navigation, Search, Wallet } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/theme';
import { useDispatchFlow } from '../../../hooks/useDispatchFlow';
import TripExperience from '../../dispatch/passenger/TripExperience';

import { Route } from '../../../types';
import { RouteDetailsCard } from './RouteDetailsCard';
import { FindingDriversPanel } from './FindingDriversPanel';

interface ContextualBottomSheetProps {
    homeState: 'idle' | 'searching' | 'active';
    onSearchPress: () => void;
    onHomePress: () => void;
    onWorkPress: () => void;
    selectedRoute?: Route | null;
    onDeselectRoute?: () => void;
    onDeleteRoute?: (routeId: string) => void;
    isDeletingRoute?: boolean;

    // Route-scoped Finding Drivers Props
    routeOffers?: any[];
    isFindingDrivers?: boolean;
    isPanelDismissed?: boolean;
    onAcceptOffer?: (offerId: string) => void;
    onRejectOffer?: (offerId: string) => void;
    isAcceptingOffer?: boolean;
    onCloseFindingPanel?: () => void;
    onOpenFindingPanel?: () => void;
    onHoverOffer?: (offer: any | null) => void;
    selectedOfferId?: string | null;
    isAssigned?: boolean;
}

export default function ContextualBottomSheet({ 
    homeState, 
    onSearchPress, 
    onHomePress, 
    onWorkPress,
    selectedRoute,
    onDeselectRoute,
    onDeleteRoute,
    isDeletingRoute,
    routeOffers = [],
    isFindingDrivers = false,
    isPanelDismissed = false,
    onAcceptOffer,
    onRejectOffer,
    isAcceptingOffer = false,
    onCloseFindingPanel,
    onOpenFindingPanel,
    onHoverOffer,
    selectedOfferId,
    isAssigned = false,
}: ContextualBottomSheetProps) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const v2Flow = useDispatchFlow();

    // Snap points based on state
    const isFinding = isFindingDrivers || routeOffers.length > 0;
    const showFindingDrivers = Boolean(selectedRoute && !isAssigned && isFinding && !isPanelDismissed);

    const snapPoints = useMemo(() => {
        if (selectedRoute) {
            if (isAssigned) {
                return ['35%', '55%'];
            }
            if (showFindingDrivers) {
                return ['45%', '72%'];
            }
            return ['38%', '65%'];
        }
        if (homeState === 'active') {
            return ['35%', '50%'];
        }
        return ['12%', '45%', '90%'];
    }, [selectedRoute, isAssigned, showFindingDrivers, homeState]);

    const handleSheetChanges = useCallback((index: number) => {
        // Handle snap changes if needed
    }, []);

    React.useEffect(() => {
        if (selectedRoute) {
            bottomSheetRef.current?.snapToIndex(0);
        } else if (homeState === 'active') {
            bottomSheetRef.current?.snapToIndex(0);
        }
    }, [selectedRoute, showFindingDrivers, homeState]);

    const renderIdleContent = () => (
        <View style={styles.idleContent}>
            {/* Dynamic Bottom Nav (Always visible at top of sheet) */}
            <View style={styles.navBar}>
                <TouchableOpacity style={styles.navItem} onPress={onHomePress}>
                    <Home size={24} color={theme.primary} />
                    <Text style={[styles.navText, { color: theme.primary }]}>Map</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => {}}>
                    <Clock size={24} color={theme.text + '80'} />
                    <Text style={[styles.navText, { color: theme.text + '80' }]}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => {}}>
                    <Wallet size={24} color={theme.text + '80'} />
                    <Text style={[styles.navText, { color: theme.text + '80' }]}>Wallet</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => {}}>
                    <Navigation size={24} color={theme.text + '80'} />
                    <Text style={[styles.navText, { color: theme.text + '80' }]}>Profile</Text>
                </TouchableOpacity>
            </View>

            {/* Search Input Trigger */}
            <TouchableOpacity 
                style={[styles.searchTrigger, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]} 
                onPress={onSearchPress}
                activeOpacity={0.8}
            >
                <Search size={20} color={theme.text + '80'} />
                <Text style={[styles.searchText, { color: theme.text + '80' }]}>Where are you going?</Text>
            </TouchableOpacity>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity style={[styles.quickChip, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]} onPress={onHomePress}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
                        <Home size={18} color={theme.primary} />
                    </View>
                    <Text style={[styles.quickText, { color: theme.text }]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.quickChip, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]} onPress={onWorkPress}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
                        <Briefcase size={18} color={theme.primary} />
                    </View>
                    <Text style={[styles.quickText, { color: theme.text }]}>Work</Text>
                </TouchableOpacity>
            </View>

            {/* Hidden Footer Hub (visible when expanded to 90%) */}
            <View style={styles.hubSection}>
                <Text style={[styles.hubTitle, { color: theme.text }]}>Your Hub</Text>
                <View style={styles.hubGrid}>
                    <TouchableOpacity style={[styles.hubItem, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                        <Clock size={24} color={theme.text} />
                        <Text style={[styles.hubItemText, { color: theme.text }]}>Recent</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.hubItem, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                        <Wallet size={24} color={theme.text} />
                        <Text style={[styles.hubItemText, { color: theme.text }]}>Wallet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.hubItem, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                        <MapPin size={24} color={theme.text} />
                        <Text style={[styles.hubItemText, { color: theme.text }]}>Places</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderBackground = useCallback(
        (props: any) => (
            <BlurView 
                {...props}
                intensity={isDark ? 50 : 80}
                tint={isDark ? 'dark' : 'light'}
                style={[
                    props.style,
                    { borderRadius: 24, overflow: 'hidden' }
                ]}
            />
        ),
        [isDark]
    );

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backgroundComponent={renderBackground}
            handleIndicatorStyle={{ backgroundColor: theme.text + '40' }}
            style={styles.sheet}
        >
            <BottomSheetView style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
                {selectedRoute ? (
                    isAssigned ? (
                        <TripExperience onClose={() => v2Flow.cancelSearch()} />
                    ) : showFindingDrivers ? (
                        <FindingDriversPanel
                            route={selectedRoute}
                            offers={routeOffers}
                            onAcceptOffer={onAcceptOffer || v2Flow.acceptOffer}
                            onRejectOffer={onRejectOffer || v2Flow.rejectOffer}
                            isAcceptingOffer={isAcceptingOffer}
                            onClose={onCloseFindingPanel || (() => {})}
                            onHoverOffer={onHoverOffer}
                            selectedOfferId={selectedOfferId}
                        />
                    ) : (
                        <View style={styles.idleContent}>
                            <RouteDetailsCard 
                                route={selectedRoute} 
                                onClose={onDeselectRoute || (() => {})}
                                onDelete={onDeleteRoute}
                                isDeleting={isDeletingRoute}
                                isFinding={isFinding}
                                offersCount={routeOffers.length}
                                onOpenFindingPanel={onOpenFindingPanel}
                            />
                            {renderIdleContent()}
                        </View>
                    )
                ) : (
                    renderIdleContent()
                )}
            </BottomSheetView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    sheet: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    idleContent: {
        flex: 1,
        paddingTop: 8,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 20,
    },
    navItem: {
        alignItems: 'center',
        gap: 4,
    },
    navText: {
        fontSize: 12,
        fontWeight: '600',
    },
    searchTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        marginBottom: 20,
    },
    searchText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    quickActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    quickChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    quickText: {
        fontSize: 15,
        fontWeight: '600',
    },
    hubSection: {
        marginTop: 12,
    },
    hubTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    hubGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    hubItem: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    hubItemText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
