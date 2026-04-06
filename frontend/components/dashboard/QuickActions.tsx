import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Crosshair, Navigation, Plus, Power } from 'lucide-react-native';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useDashboardStore } from '../../store/useDashboardStore';

interface QuickActionsProps {
    onCenterMap: () => void;
    onCreateRoute: () => void;
}

export default function QuickActions({ onCenterMap, onCreateRoute }: QuickActionsProps) {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { driverStatus, toggleDriverStatus } = useDashboardStore();

    const isOnline = driverStatus === 'online';

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
            label: isOnline ? 'Online' : 'Offline',
            onPress: toggleDriverStatus,
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
        <View style={styles.container}>
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
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(255,255,255,0.92)',
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
                                    <Icon size={20} color="#fff" strokeWidth={2.5} />
                                </LinearGradient>
                            ) : (
                                <Icon size={20} color={theme.text} strokeWidth={2.5} />
                            )}
                        </TouchableOpacity>
                        <Text style={[
                            styles.actionLabel,
                            { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }
                        ]}>
                            {action.label}
                        </Text>
                    </Animated.View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 16,
        bottom: 180,
        gap: 12,
        alignItems: 'center',
        zIndex: 90,
    },
    actionBtn: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    gradientFill: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 4,
        letterSpacing: -0.2,
    },
});
