import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Star, Clock, Car, X, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';

interface Offer {
    _id: string;
    driverId: any; 
    price: number;
    estimatedArrival: number; // in seconds
}

interface Props {
    offers: Offer[];
    onAcceptOffer: (offerId: string) => void;
    onCancel: () => void;
}

export default function OffersView({ offers, onAcceptOffer, onCancel }: Props) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)';
    const offerCardBg = isDark ? '#2C2C2E' : '#F2F2F7';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';

    return (
        <View style={styles.container}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.card, { backgroundColor: cardBg }]}>
                
                <View style={styles.header}>
                    <Text style={[styles.title, { color: textColor }]}>
                        {offers.length === 0 ? 'Waiting for offers...' : `${offers.length} offers available`}
                    </Text>
                    <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                        <X size={20} color={subtextColor} />
                    </TouchableOpacity>
                </View>

                {offers.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: subtextColor }]}>Drivers are reviewing your request</Text>
                    </View>
                )}

                <ScrollView 
                    style={styles.offersList} 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 16 }}
                >
                    {offers.map((offer, index) => {
                        const driver = offer.driverId || {};
                        const name = driver.fullName || `Driver ${String(offer.driverId).slice(-4)}`;
                        const rating = driver.rating || '4.9';
                        const vehicle = driver.vehicle ? `${driver.vehicle.color} ${driver.vehicle.model}` : 'Standard Ride';
                        
                        return (
                            <Animated.View 
                                key={offer._id} 
                                entering={FadeInDown.delay(index * 100).springify()}
                                layout={Layout.springify()}
                            >
                                <TouchableOpacity 
                                    style={[styles.offerCard, { backgroundColor: offerCardBg }]}
                                    onPress={() => onAcceptOffer(offer._id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.offerRow}>
                                        <View style={styles.driverInfo}>
                                            {driver.photoURL ? (
                                                <Image source={{ uri: driver.photoURL }} style={styles.avatar} contentFit="cover" />
                                            ) : (
                                                <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
                                                    <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                                                </View>
                                            )}
                                            
                                            <View style={styles.driverDetails}>
                                                <View style={styles.nameRow}>
                                                    <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>{name}</Text>
                                                    <View style={styles.ratingBadge}>
                                                        <Star size={12} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 2 }} />
                                                        <Text style={styles.ratingText}>{rating}</Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.vehicle, { color: subtextColor }]}>{vehicle}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.priceContainer}>
                                            <Text style={[styles.price, { color: textColor }]}>MAD {offer.price}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.footerRow}>
                                        <View style={styles.etaContainer}>
                                            <Clock size={14} color={theme.primary} style={{ marginRight: 6 }} />
                                            <Text style={[styles.etaText, { color: textColor }]}>
                                                {Math.round(offer.estimatedArrival / 60)} min away
                                            </Text>
                                        </View>
                                        
                                        <View style={styles.acceptRow}>
                                            <Text style={[styles.acceptText, { color: theme.primary }]}>Accept</Text>
                                            <ChevronRight size={16} color={theme.primary} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </ScrollView>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 20,
    },
    card: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        paddingBottom: 8,
        maxHeight: 500,
        overflow: 'hidden',
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
        letterSpacing: -0.5,
    },
    cancelBtn: {
        padding: 4,
    },
    emptyState: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
    },
    offersList: {
        width: '100%',
    },
    offerCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    offerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    avatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    driverDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F59E0B',
    },
    vehicle: {
        fontSize: 13,
    },
    priceContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    price: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(150, 150, 150, 0.15)',
        marginBottom: 12,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    etaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    etaText: {
        fontSize: 14,
        fontWeight: '600',
    },
    acceptRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    acceptText: {
        fontSize: 15,
        fontWeight: '700',
        marginRight: 2,
    }
});
