import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Crosshair, Navigation, Plus, Power } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import Animated, { FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/theme';
import { useDashboardStore } from '../../store/useDashboardStore';

interface QuickActionsProps {
    onCenterMap: () => void;
    onCreateRoute: () => void;
    isOnline?: boolean;
    onToggleStatus?: () => void;
    isUpdatingStatus?: boolean;
    isRouteSelected?: boolean;
    isFindingOpen?: boolean;
}

export default function QuickActions({
    onCenterMap,
    onCreateRoute,
    isOnline: propIsOnline,
    onToggleStatus: propOnToggleStatus,
    isUpdatingStatus: propIsUpdatingStatus,
    isRouteSelected = false,
    isFindingOpen = false,
}: QuickActionsProps) {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { driverStatus, toggleDriverStatus, isUpdatingStatus: v1Updating } = useDashboardStore();

    const isOnline = propIsOnline !== undefined ? propIsOnline : (driverStatus === 'ONLINE');
    const onToggle = propOnToggleStatus || toggleDriverStatus;
    const isUpdating = propIsUpdatingStatus !== undefined ? propIsUpdatingStatus : v1Updating;

    const bottomPos = useSharedValue(isRouteSelected ? 300 : 180);

    useEffect(() => {
        // Dynamically adjust height to avoid overlapping with bottom cards
        let targetBottom = 180;
        if (isFindingOpen) {
            targetBottom = 500; // very high if finding open
        } else if (isRouteSelected) {
            targetBottom = 340; // above route card
        }
        bottomPos.value = withSpring(targetBottom, {
            damping: 18,
            stiffness: 150,
            mass: 0.8
        });
    }, [isRouteSelected, isFindingOpen]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            bottom: bottomPos.value,
        };
    });

    const actions = [
        {
            id: 'create-route',
            icon: Plus,
            label: 'Route',
            onPress: onCreateRoute,
            gradient: [theme.primary, theme.secondary || theme.primary] as [string, string],
        },
        {
            id: 'toggle-status',
            icon: Power,
            label: isUpdating ? 'Wait' : isOnline ? 'Online' : 'Offline',
            onPress: onToggle,
            gradient: isOnline
                ? ['#34D399', '#10B981'] as [string, string]
                : ['#9CA3AF', '#6B7280'] as [string, string],
        },
        {
            id: 'center-map',
            icon: Crosshair,
            label: 'Center',
            onPress: onCenterMap,
            gradient: null,
        },
    ];

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                    <Animated.View
                        key={action.id}
                        entering={FadeInRight.delay(200 + index * 100).springify()}
                    >
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                !action.gradient && {
                                    backgroundColor: colorScheme === 'dark'
                                        ? 'rgba(40,40,44,0.85)'
                                        : 'rgba(255,255,255,0.92)',
                                    borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    borderWidth: 1,
                                }
                            ]}
                            onPress={action.onPress}
                            activeOpacity={0.8}
                        >
                            {action.gradient ? (
                                <LinearGradient
                                    colors={action.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.gradientFill}
                                >
                                    <Icon size={22} color="#fff" strokeWidth={2.5} />
                                </LinearGradient>
                            ) : (
                                <BlurView intensity={40} tint={colorScheme} style={styles.blurWrap}>
                                    <Icon size={22} color={theme.text} strokeWidth={2.5} />
                                </BlurView>
                            )}
                        </TouchableOpacity>
                        <Text style={[
                            styles.actionLabel,
                            { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)' }
                        ]}>
                            {action.label}
                        </Text>
                    </Animated.View>
                );
            })}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 16,
        gap: 16,
        alignItems: 'center',
        zIndex: 90,
    },
    actionBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        // Enhanced shadow for a floating feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    gradientFill: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blurWrap: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 6,
        letterSpacing: -0.2,
        textShadowColor: 'rgba(255,255,255,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
