import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Car, Check, Clock, Star, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { Offer } from '../../store/useRideStore';

type Props = {
    offers: Offer[];
    theme: any;
    isDark: boolean;
    onAccept: (offerId: string) => void;
    onReject: (offerId: string) => void;
};

export default function OfferList({ offers, theme, isDark, onAccept, onReject }: Props) {
    const insets = useSafeAreaInsets();
    const surfaceBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';

    if (!offers || offers.length === 0) {
        return (
            <View style={styles.searchingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.searchingText, { color: theme.text }]}>Searching for drivers...</Text>
                <Text style={[styles.searchingSubtext, { color: theme.icon }]}>This usually takes a few seconds</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Available Offers</Text>
                <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.badgeText, { color: theme.primary }]}>{offers.length} nearby</Text>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {offers.map((offer, index) => (
                    <OfferCard
                        key={offer._id}
                        offer={offer}
                        theme={theme}
                        isDark={isDark}
                        onAccept={() => onAccept(offer._id)}
                        onReject={() => onReject(offer._id)}
                        index={index}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

function OfferCard({ offer, theme, isDark, onAccept, onReject, index }: { offer: Offer, theme: any, isDark: boolean, onAccept: () => void, onReject: () => void, index: number }) {
    const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000)));

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = Math.max(0, Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) {
                clearInterval(timer);
                onReject(); // Auto-reject when expired
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [offer.expiresAt]);

    const progress = timeLeft / 60; // Assuming 60s total

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100).springify()}
            exiting={FadeOutUp}
            style={[styles.card, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}
        >
            <View style={styles.cardHeader}>
                <View style={styles.driverInfo}>
                    <Image source={{ uri: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(offer.driverDetails?.name || 'Driver') }} style={styles.avatar} contentFit="cover" />
                    <View>
                        <Text style={[styles.driverName, { color: theme.text }]}>{offer.driverDetails?.name || 'Unknown Driver'}</Text>
                        <View style={styles.ratingRow}>
                            <Star size={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={[styles.ratingText, { color: theme.textSecondary || '#6B7280' }]}>{(offer.driverDetails?.rating || 5.0).toFixed(1)}</Text>
                        </View>
                    </View>
                </View>
                <Text style={[styles.priceText, { color: theme.primary }]}>{offer.proposedPrice} MAD</Text>
            </View>

            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <Car size={16} color={theme.icon} />
                    <Text style={[styles.detailText, { color: theme.text }]}>{offer.driverDetails?.vehicle || 'Standard Car'}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Clock size={16} color={theme.icon} />
                    <Text style={[styles.detailText, { color: theme.text }]}>{offer.etaMinutes} min away</Text>
                </View>
            </View>

            <View style={styles.timerBarBg}>
                <Animated.View style={[styles.timerBarFill, { backgroundColor: theme.primary, width: `${progress * 100}%` }]} />
            </View>
            <Text style={[styles.timerText, { color: theme.icon }]}>Expires in {timeLeft}s</Text>

            <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn, { backgroundColor: isDark ? '#3A3A3C' : '#F2F2F7' }]} onPress={onReject}>
                    <X size={20} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: theme.primary }]} onPress={onAccept}>
                    <Text style={styles.acceptBtnText}>Accept Offer</Text>
                    <Check size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginRight: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    searchingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    searchingText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    searchingSubtext: {
        fontSize: 14,
        marginTop: 8,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 16,
    },
    card: {
        width: SCREEN_WIDTH * 0.85,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    driverName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '500',
    },
    priceText: {
        fontSize: 22,
        fontWeight: '800',
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        fontWeight: '500',
    },
    timerBarBg: {
        height: 4,
        backgroundColor: '#E5E5EA',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    timerBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    timerText: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    rejectBtn: {
        width: 60,
    },
    acceptBtn: {
        flex: 1,
    },
    acceptBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
