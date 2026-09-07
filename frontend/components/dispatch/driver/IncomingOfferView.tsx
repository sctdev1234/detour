import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { MapPin, Clock, DollarSign, Check, X, MessageSquare, Edit3, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../../constants/theme';
import { DriverOffer } from '../../../store/useDriverDispatchStore';
import { RouteService } from '../../../services/RouteService';

interface Props {
    offer: DriverOffer;
    onAccept: (offerId: string) => void;
    onReject: (offerId: string, reason?: string) => void;
    onCounter: (offerId: string, counterPrice: number) => void;
}

export default function IncomingOfferView({ offer, onAccept, onReject, onCounter }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [showCounter, setShowCounter] = useState(false);
    const [counterPrice, setCounterPrice] = useState(offer.counterPrice ? String(offer.counterPrice) : '');
    const [isSending, setIsSending] = useState(false);
    const [hasSentCounter, setHasSentCounter] = useState(Boolean(offer.isCountered || offer.counterPrice));
    const [sentAmount, setSentAmount] = useState<number | null>(offer.counterPrice || null);

    // Address resolution
    const [pickupAddress, setPickupAddress] = useState(offer.pickup?.address || 'Pickup location');
    const [destAddress, setDestAddress] = useState(offer.destination?.address || 'Destination');

    useEffect(() => {
        let isMounted = true;
        const pAddr = offer.pickup?.address;
        if (!pAddr || pAddr === 'Pickup location' || pAddr === 'Current Location' || pAddr === 'Pickup') {
            const pLat = (offer.pickup as any)?.latitude ?? offer.pickup?.coordinates?.[1];
            const pLng = (offer.pickup as any)?.longitude ?? offer.pickup?.coordinates?.[0];
            if (pLat && pLng) {
                RouteService.reverseGeocode(pLat, pLng).then(addr => {
                    if (isMounted && addr) setPickupAddress(addr);
                });
            }
        } else {
            setPickupAddress(pAddr);
        }

        const dAddr = offer.destination?.address;
        if (!dAddr || dAddr === 'Destination') {
            const dLat = (offer.destination as any)?.latitude ?? offer.destination?.coordinates?.[1];
            const dLng = (offer.destination as any)?.longitude ?? offer.destination?.coordinates?.[0];
            if (dLat && dLng) {
                RouteService.reverseGeocode(dLat, dLng).then(addr => {
                    if (isMounted && addr) setDestAddress(addr);
                });
            }
        } else {
            setDestAddress(dAddr);
        }

        return () => { isMounted = false; };
    }, [offer._id, offer.pickup, offer.destination]);

    const etaMinutes = Math.ceil((offer.estimatedArrival || 0) / 60);

    const handleSendCounter = async () => {
        const price = parseFloat(counterPrice);
        if (!price || price <= 0) return;
        try {
            setIsSending(true);
            await onCounter(offer._id, price);
            setSentAmount(price);
            setHasSentCounter(true);
            setShowCounter(false);
        } catch (err) {
            console.error('[IncomingOfferView] counter offer failed:', err);
        } finally {
            setIsSending(false);
        }
    };

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios'
        ? { intensity: 90, tint: colorScheme }
        : {};
    
    const bgColor = colorScheme === 'dark'
        ? 'rgba(28, 28, 30, 0.95)'
        : 'rgba(255, 255, 255, 0.95)';

    const isDeclined = Boolean(offer.isDeclined);

    return (
        <View style={styles.wrapper}>
            <Container
                {...containerProps}
                style={[styles.container, Platform.OS !== 'ios' && { backgroundColor: bgColor }]}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={[styles.pingIndicator, isDeclined && { backgroundColor: '#ef4444' }]} />
                    <Text style={[styles.header, { color: theme.text }]}>
                        {isDeclined ? 'Proposition Declined' : (hasSentCounter ? 'Proposition Sent' : 'New Trip Request')}
                    </Text>
                </View>

                {/* Client Declined Banner */}
                {isDeclined && (
                    <Animated.View entering={FadeInDown.springify()} style={styles.declinedBanner}>
                        <AlertCircle size={18} color="#ef4444" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.declinedTitle}>Client declined your proposition</Text>
                            <Text style={styles.declinedSub}>
                                The client declined {sentAmount || offer.counterPrice} MAD. You can propose another price or accept the original fare.
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Proposition Sent & Waiting Banner */}
                {!isDeclined && hasSentCounter && !showCounter && (
                    <Animated.View entering={FadeInDown.springify()} style={styles.waitingBanner}>
                        <View style={styles.waitingTopRow}>
                            <View style={styles.pulseDotWrapper}>
                                <View style={[styles.pulseDotGlow, { backgroundColor: '#3b82f640' }]} />
                                <View style={[styles.pulseDot, { backgroundColor: '#3b82f6' }]} />
                            </View>
                            <Text style={styles.waitingTitle}>Proposed: {sentAmount} MAD</Text>
                            <TouchableOpacity
                                style={styles.changePropBtn}
                                onPress={() => setShowCounter(true)}
                                activeOpacity={0.7}
                            >
                                <Edit3 size={12} color="#3b82f6" />
                                <Text style={styles.changePropText}>Change</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.waitingSub}>
                            Waiting for client response... You can modify this proposition at any time.
                        </Text>
                    </Animated.View>
                )}

                {/* Route Info */}
                <View style={styles.routeCard}>
                    <View style={styles.routeRow}>
                        <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                        <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>{pickupAddress}</Text>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routeRow}>
                        <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                        <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>{destAddress}</Text>
                    </View>
                </View>

                {/* Metrics Row */}
                <View style={[styles.metricsRow, { backgroundColor: theme.surfaceHighlight + '40' }]}>
                    <View style={styles.metric}>
                        <DollarSign size={20} color={theme.primary} />
                        <Text style={[styles.metricValue, { color: theme.text }]}>{offer.price} MAD</Text>
                        <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Client Fare</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: 'rgba(156, 163, 175, 0.2)' }]} />
                    <View style={styles.metric}>
                        <Clock size={20} color="#f59e0b" />
                        <Text style={[styles.metricValue, { color: theme.text }]}>{etaMinutes} min</Text>
                        <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>ETA</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: 'rgba(156, 163, 175, 0.2)' }]} />
                    <View style={styles.metric}>
                        <MapPin size={20} color="#3b82f6" />
                        <Text style={[styles.metricValue, { color: theme.text }]}>{Math.ceil((offer.estimatedDuration || 0) / 60)} min</Text>
                        <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Trip</Text>
                    </View>
                </View>

                {/* Counter-offer input */}
                {showCounter && (
                    <Animated.View entering={FadeInUp.springify()} style={styles.counterContainer}>
                        <TextInput
                            style={[styles.counterInput, { color: theme.text, borderColor: '#3b82f6', backgroundColor: theme.background }]}
                            placeholder="Enter proposed price (MAD)"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                            value={counterPrice}
                            onChangeText={setCounterPrice}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.counterSubmit, { backgroundColor: '#3b82f6', opacity: counterPrice && !isSending ? 1 : 0.5 }]}
                            onPress={handleSendCounter}
                            disabled={!counterPrice || isSending}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.counterSubmitText}>
                                    {hasSentCounter ? 'Update' : 'Send'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.rejectBtn, { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}
                        onPress={() => onReject(offer._id)}
                        activeOpacity={0.7}
                    >
                        <X size={22} color="#ef4444" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.counterBtn, { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' }]}
                        onPress={() => setShowCounter(!showCounter)}
                        activeOpacity={0.7}
                    >
                        <MessageSquare size={18} color="#3b82f6" />
                        <Text style={styles.counterText}>
                            {showCounter ? 'Cancel' : (hasSentCounter ? 'Edit Price' : 'Propose Price')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => onAccept(offer._id)}
                        activeOpacity={0.8}
                    >
                        <Check size={20} color="#fff" />
                        <Text style={styles.acceptText}>
                            {isDeclined ? `Accept ${offer.price} MAD` : 'Accept'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        paddingBottom: 20,
    },
    container: {
        padding: 22,
        borderRadius: 24,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        gap: 8,
    },
    pingIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
    },
    header: {
        fontSize: 18,
        fontWeight: '900',
    },
    declinedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.25)',
    },
    declinedTitle: {
        color: '#dc2626',
        fontWeight: '800',
        fontSize: 13,
    },
    declinedSub: {
        color: '#991b1b',
        fontWeight: '500',
        fontSize: 11,
        marginTop: 2,
    },
    waitingBanner: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.25)',
    },
    waitingTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    pulseDotWrapper: {
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    pulseDotGlow: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    waitingTitle: {
        flex: 1,
        color: '#2563eb',
        fontWeight: '800',
        fontSize: 13,
    },
    changePropBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    changePropText: {
        color: '#2563eb',
        fontWeight: '700',
        fontSize: 11,
    },
    waitingSub: {
        color: '#1d4ed8',
        fontWeight: '500',
        fontSize: 11,
    },
    routeCard: {
        marginBottom: 18,
        paddingHorizontal: 4,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    routeLine: {
        width: 2,
        height: 22,
        backgroundColor: 'rgba(156, 163, 175, 0.3)',
        marginLeft: 4,
        marginVertical: 3,
    },
    routeText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 20,
        paddingVertical: 14,
        borderRadius: 16,
    },
    metric: {
        alignItems: 'center',
        gap: 3,
        flex: 1,
    },
    metricValue: {
        fontSize: 17,
        fontWeight: '800',
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    metricDivider: {
        width: 1,
        height: 32,
    },
    counterContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    counterInput: {
        flex: 1,
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '700',
    },
    counterSubmit: {
        paddingHorizontal: 20,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterSubmitText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    rejectBtn: {
        width: 54,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
    },
    counterBtn: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 14,
        borderWidth: 1.5,
        gap: 6,
    },
    counterText: {
        color: '#3b82f6',
        fontWeight: '800',
        fontSize: 14,
    },
    acceptBtn: {
        flex: 1.4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 14,
        gap: 6,
    },
    acceptText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 15,
        letterSpacing: 0.3,
    }
});
