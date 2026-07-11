import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { User, Phone, MessageCircle, Shield } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Props {
    driverId: string;
    status: 'EN_ROUTE' | 'ARRIVED';
    onCancel?: () => void;
}

export default function ArrivalView({ driverId, status, onCancel }: Props) {
    const isArrived = status === 'ARRIVED';
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';

    return (
        <Animated.View entering={FadeInUp.springify()} style={styles.container}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.card, { backgroundColor: cardBg }]}>
                
                {/* Status Header */}
                <View style={styles.statusHeader}>
                    <View style={[styles.statusDot, { backgroundColor: isArrived ? '#34C759' : '#0A84FF' }]} />
                    <Text style={[styles.statusText, { color: textColor }]}>
                        {isArrived ? 'Driver is Here' : 'Driver Approaching'}
                    </Text>
                </View>

                <Text style={[styles.instructionText, { color: subtextColor }]}>
                    {isArrived ? 'Please locate your driver and board the vehicle.' : 'Your driver will arrive shortly. Please be ready.'}
                </Text>

                {/* Driver Info */}
                <View style={styles.driverInfoRow}>
                    <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
                        <User size={24} color="#FFF" />
                    </View>
                    <View style={styles.driverDetails}>
                        <Text style={[styles.driverName, { color: textColor }]}>Driver {driverId.slice(-4)}</Text>
                        <View style={styles.vehicleRow}>
                            <Text style={[styles.vehicleText, { color: subtextColor }]}>Standard Ride</Text>
                            <View style={styles.dotSeparator} />
                            <Text style={[styles.plateText, { color: textColor }]}>ABC-123</Text>
                        </View>
                    </View>
                </View>

                {/* Safety Banner */}
                <View style={[styles.safetyBanner, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    <Shield size={16} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.safetyText, { color: subtextColor }]}>Please verify the license plate</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#3A3A3C' : '#F2F2F7' }]}>
                        <Phone size={20} color={textColor} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#3A3A3C' : '#F2F2F7' }]}>
                        <MessageCircle size={20} color={textColor} />
                    </TouchableOpacity>
                    
                    {onCancel && !isArrived && (
                        <TouchableOpacity 
                            style={[styles.cancelButton, { backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 59, 48, 0.1)' }]} 
                            onPress={onCancel}
                        >
                            <Text style={[styles.cancelButtonText, { color: isDark ? '#FF453A' : '#FF3B30' }]}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
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
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    instructionText: {
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
    },
    driverInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarFallback: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    driverDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    driverName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    vehicleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vehicleText: {
        fontSize: 14,
        fontWeight: '500',
    },
    dotSeparator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#C7C7CC',
        marginHorizontal: 6,
    },
    plateText: {
        fontSize: 14,
        fontWeight: '700',
    },
    safetyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 20,
    },
    safetyText: {
        fontSize: 13,
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '700',
    }
});
