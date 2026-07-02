import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';
import { Wifi, Coffee } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    onGoOffline: () => void;
    onTakeBreak: () => void;
}

export default function OnlineIdleView({ onGoOffline, onTakeBreak }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Pulsing animation for "listening" indicator
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0.6);

    useEffect(() => {
        pulseScale.value = withRepeat(
            withTiming(2.2, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1, false
        );
        pulseOpacity.value = withRepeat(
            withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1, false
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }));

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            {/* Pulsing indicator */}
            <View style={styles.pulseWrapper}>
                <Animated.View style={[styles.pulseRing, pulseStyle]} />
                <View style={[styles.statusDot, { backgroundColor: '#10b981' }]}>
                    <Wifi size={24} color="#fff" />
                </View>
            </View>

            <Text style={[styles.title, { color: theme.text }]}>You're Online</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Waiting for trip requests...
            </Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}
                    onPress={onTakeBreak}
                    activeOpacity={0.7}
                >
                    <Coffee size={18} color="#f59e0b" />
                    <Text style={[styles.actionText, { color: '#f59e0b' }]}>Take Break</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                    onPress={onGoOffline}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Go Offline</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        marginHorizontal: 16,
    },
    pulseWrapper: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    pulseRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#10b981',
    },
    statusDot: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    actionText: {
        fontWeight: '700',
        fontSize: 14,
    }
});
