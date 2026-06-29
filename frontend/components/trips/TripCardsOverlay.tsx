import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { ClientTrip } from '../../types';
import TripCard from './TripCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

type Props = {
    trips: ClientTrip[];
    theme: any;
    colorScheme: 'light' | 'dark';
    onTripSelect: (trip: ClientTrip) => void;
    onTripDetails: (trip: ClientTrip) => void;
    onAddTrip: () => void;
};

export default function TripCardsOverlay({
    trips,
    theme,
    colorScheme,
    onTripSelect,
    onTripDetails,
    onAddTrip,
}: Props) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const isDark = colorScheme === 'dark';

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / (CARD_WIDTH + 16));
        if (index !== selectedIndex && index >= 0 && index < trips.length) {
            setSelectedIndex(index);
            onTripSelect(trips[index]);
        }
    };

    return (
        <View style={styles.container}>
            {/* Trip counter & Add button */}
            <Animated.View entering={FadeInDown.delay(100)} style={styles.headerRow}>
                <BlurView
                    intensity={60}
                    tint={isDark ? 'dark' : 'light'}
                    style={[styles.tripCountBadge, { backgroundColor: isDark ? 'rgba(28,28,30,0.8)' : 'rgba(255,255,255,0.85)' }]}
                >
                    <Text style={[styles.tripCountText, { color: theme.text }]}>
                        {trips.length} Trip{trips.length !== 1 ? 's' : ''}
                    </Text>
                </BlurView>

                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: theme.primary }]}
                    onPress={onAddTrip}
                    activeOpacity={0.85}
                >
                    <Plus size={22} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
            </Animated.View>

            {/* Trip cards carousel */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
                <ScrollView
                    horizontal
                    pagingEnabled={false}
                    snapToInterval={CARD_WIDTH + 16}
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carouselContent}
                    onMomentumScrollEnd={handleScroll}
                >
                    {trips.map((trip, index) => (
                        <View key={trip.id} style={{ width: CARD_WIDTH }}>
                            <TripCard
                                trip={trip}
                                theme={theme}
                                index={index}
                                isSelected={index === selectedIndex}
                                onPress={() => {
                                    setSelectedIndex(index);
                                    onTripSelect(trip);
                                }}
                                onDetailsPress={() => onTripDetails(trip)}
                            />
                        </View>
                    ))}
                </ScrollView>
            </Animated.View>

            {/* Page indicator dots */}
            {trips.length > 1 && (
                <View style={styles.dotsRow}>
                    {trips.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: i === selectedIndex ? theme.primary : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                                    width: i === selectedIndex ? 20 : 6,
                                }
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    tripCountBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 14,
        overflow: 'hidden',
    },
    tripCountText: {
        fontSize: 14,
        fontWeight: '700',
    },
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        boxShadow: '0px 4px 16px rgba(0,102,255,0.3)',
    },
    carouselContent: {
        paddingHorizontal: 24,
        gap: 16,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
        marginTop: 12,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
});
