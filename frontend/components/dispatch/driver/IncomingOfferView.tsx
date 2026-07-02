import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput } from 'react-native';
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

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <Text style={[styles.header, { color: theme.text }]}>New Trip Request</Text>

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
            <View style={styles.metricsRow}>
                <View style={styles.metric}>
                    <DollarSign size={18} color={theme.primary} />
                    <Text style={[styles.metricValue, { color: theme.text }]}>{offer.price} MAD</Text>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Fare</Text>
                </View>
                <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
                <View style={styles.metric}>
                    <Clock size={18} color="#f59e0b" />
                    <Text style={[styles.metricValue, { color: theme.text }]}>{etaMinutes} min</Text>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>ETA</Text>
                </View>
                <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
                <View style={styles.metric}>
                    <MapPin size={18} color="#3b82f6" />
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
                        <Text style={styles.counterSubmitText}>Send Counter</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.rejectBtn, { borderColor: '#ef4444' }]}
                    onPress={() => onReject(offer._id)}
                    activeOpacity={0.7}
                >
                    <X size={20} color="#ef4444" />
                    <Text style={[styles.rejectText]}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.counterBtn, { borderColor: '#3b82f6' }]}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderRadius: 20,
        marginHorizontal: 16,
    },
    header: {
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 16,
        textAlign: 'center',
    },
    routeCard: {
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    routeLine: {
        width: 2,
        height: 20,
        backgroundColor: '#E5E7EB',
        marginLeft: 5,
        marginVertical: 2,
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
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    metric: {
        alignItems: 'center',
        gap: 4,
    },
    metricValue: {
        fontSize: 16,
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
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 16,
        fontWeight: '700',
    },
    counterSubmit: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        justifyContent: 'center',
    },
    counterSubmitText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        gap: 6,
    },
    rejectText: {
        color: '#ef4444',
        fontWeight: '800',
        fontSize: 14,
    },
    counterBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        gap: 6,
    },
    counterText: {
        color: '#3b82f6',
        fontWeight: '800',
        fontSize: 14,
    },
    acceptBtn: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
    acceptText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 14,
    }
});
