import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Star, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Props {
    summary?: any;
    onDone: () => void;
}

export default function CompletedView({ summary, onDone }: Props) {
    const [rating, setRating] = useState(0);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const highlightBg = isDark ? '#1C1C1E' : '#F2F2F7';
    
    const fare = summary?.finalPrice || '0.00';
    const distance = summary?.distanceKm ? `${summary.distanceKm} km` : '0 km';
    const duration = summary?.durationMins ? `${summary.durationMins} min` : '0 min';

    return (
        <Animated.View entering={FadeInUp.springify()} style={styles.container}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.card, { backgroundColor: cardBg }]}>
                
                {/* Header */}
                <View style={styles.header}>
                    <CheckCircle2 size={40} color="#34C759" style={{ marginBottom: 12 }} />
                    <Text style={[styles.title, { color: textColor }]}>You've arrived</Text>
                    <Text style={[styles.subtitle, { color: subtextColor }]}>Hope you enjoyed the ride</Text>
                </View>

                {/* Receipt Card */}
                <View style={[styles.receiptCard, { backgroundColor: highlightBg }]}>
                    <View style={styles.priceRow}>
                        <Text style={[styles.currency, { color: textColor }]}>MAD</Text>
                        <Text style={[styles.price, { color: textColor }]}>{fare}</Text>
                    </View>
                    
                    <View style={styles.receiptDivider} />
                    
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: subtextColor }]}>Distance</Text>
                            <Text style={[styles.statValue, { color: textColor }]}>{distance}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: subtextColor }]}>Duration</Text>
                            <Text style={[styles.statValue, { color: textColor }]}>{duration}</Text>
                        </View>
                    </View>
                </View>

                {/* Rating Section */}
                <View style={styles.ratingSection}>
                    <Text style={[styles.ratingLabel, { color: textColor }]}>Rate your driver</Text>
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity 
                                key={star} 
                                onPress={() => setRating(star)}
                                activeOpacity={0.7}
                            >
                                <Star 
                                    size={36} 
                                    color={star <= rating ? '#F59E0B' : subtextColor} 
                                    fill={star <= rating ? '#F59E0B' : 'transparent'}
                                    style={{ marginHorizontal: 4 }}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.actionRow}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                            <HelpCircle size={20} color="#FF3B30" />
                        </View>
                        <Text style={[styles.actionText, { color: textColor }]}>Report an issue</Text>
                        <ChevronRight size={20} color={subtextColor} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={[styles.doneButton, { backgroundColor: theme.primary }]} 
                    onPress={onDone}
                >
                    <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
                
            </BlurView>
        </Animated.View>
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
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    receiptCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        alignItems: 'center',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    currency: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 6,
        marginRight: 4,
    },
    price: {
        fontSize: 40,
        fontWeight: '800',
        letterSpacing: -1.5,
    },
    receiptDivider: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(150, 150, 150, 0.2)',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 13,
        marginBottom: 4,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    statDivider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(150, 150, 150, 0.2)',
    },
    ratingSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    ratingLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(150, 150, 150, 0.15)',
        marginBottom: 20,
    },
    quickActions: {
        marginBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    doneButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    }
});
