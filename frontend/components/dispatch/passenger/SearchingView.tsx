import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Search, X } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    onCancel: () => void;
}

export default function SearchingView({ onCancel }: Props) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    // Radar pulse animation
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1,
            false
        );
    }, []);

    const animatedPulseStyle = useAnimatedStyle(() => {
        const opacity = interpolate(pulse.value, [0, 0.8, 1], [0.8, 0, 0], Extrapolate.CLAMP);
        const scale = interpolate(pulse.value, [0, 1], [0.8, 2.5], Extrapolate.CLAMP);
        return {
            opacity,
            transform: [{ scale }]
        };
    });

    const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';

    return (
        <View style={styles.container}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.card, { backgroundColor: cardBg }]}>
                
                <View style={styles.animationContainer}>
                    <Animated.View style={[styles.pulseCircle, animatedPulseStyle, { backgroundColor: theme.primary }]} />
                    <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
                        <Search size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                </View>

                <Text style={[styles.title, { color: textColor }]}>Finding your driver</Text>
                <Text style={[styles.subtitle, { color: subtextColor }]}>Connecting you to the nearest available drivers...</Text>
                
                <TouchableOpacity 
                    style={[styles.cancelButton, { backgroundColor: isDark ? '#3A3A3C' : '#F2F2F7' }]} 
                    onPress={onCancel}
                    activeOpacity={0.7}
                >
                    <X size={18} color={textColor} style={{ marginRight: 6 }} />
                    <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
                </TouchableOpacity>

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
        alignItems: 'center',
        overflow: 'hidden',
    },
    animationContainer: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    pulseCircle: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        width: '100%',
    },
    cancelButtonText: {
        fontWeight: '600',
        fontSize: 16,
    }
});
