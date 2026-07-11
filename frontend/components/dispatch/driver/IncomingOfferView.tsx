import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MapPin, Clock, DollarSign, Check, X, MessageSquare } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';
import { DriverOffer } from '../../../store/useDriverDispatchStore';

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
    const [counterPrice, setCounterPrice] = useState('');

    const pickupAddress = offer.pickup?.address || 'Pickup location';
    const destAddress = offer.destination?.address || 'Destination';
    const etaMinutes = Math.ceil((offer.estimatedArrival || 0) / 60);

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios'
        ? { intensity: 90, tint: colorScheme }
        : {};
    
    const bgColor = colorScheme === 'dark'
        ? 'rgba(28, 28, 30, 0.95)'
        : 'rgba(255, 255, 255, 0.95)';

    return (
        <View style={styles.wrapper}>
            <Container
                {...containerProps}
                style={[styles.container, Platform.OS !== 'ios' && { backgroundColor: bgColor }]}
            >
                <View style={styles.headerRow}>
                    <View style={styles.pingIndicator} />
                    <Text style={[styles.header, { color: theme.text }]}>New Trip Request</Text>
                </View>

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
                        <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Fare</Text>
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
                    <View style={styles.counterContainer}>
                        <TextInput
                            style={[styles.counterInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                            placeholder="Your price (MAD)"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                            value={counterPrice}
                            onChangeText={setCounterPrice}
                        />
                        <TouchableOpacity
                            style={[styles.counterSubmit, { backgroundColor: '#3b82f6', opacity: counterPrice ? 1 : 0.5 }]}
                            onPress={() => {
                                const price = parseFloat(counterPrice);
                                if (price > 0) onCounter(offer._id, price);
                            }}
                            disabled={!counterPrice}
                        >
                            <Text style={styles.counterSubmitText}>Send</Text>
                        </TouchableOpacity>
                    </View>
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
                        <Text style={styles.counterText}>Counter</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => onAccept(offer._id)}
                        activeOpacity={0.8}
                    >
                        <Check size={20} color="#fff" />
                        <Text style={styles.acceptText}>Accept</Text>
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
        padding: 24,
        borderRadius: 24,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 8,
    },
    pingIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
    },
    header: {
        fontSize: 20,
        fontWeight: '900',
    },
    routeCard: {
        marginBottom: 20,
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
        height: 24,
        backgroundColor: 'rgba(156, 163, 175, 0.3)',
        marginLeft: 4,
        marginVertical: 4,
    },
    routeText: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 24,
        paddingVertical: 16,
        borderRadius: 16,
    },
    metric: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    metricDivider: {
        width: 1,
        height: 36,
    },
    counterContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    counterInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '700',
    },
    counterSubmit: {
        paddingHorizontal: 20,
        borderRadius: 12,
        justifyContent: 'center',
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
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
    },
    counterBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        gap: 6,
    },
    counterText: {
        color: '#3b82f6',
        fontWeight: '800',
        fontSize: 15,
    },
    acceptBtn: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    acceptText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    }
});
