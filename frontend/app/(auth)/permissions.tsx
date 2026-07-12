import { useUIStore } from '@/store/useUIStore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, MapPin, CheckCircle, Shield } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';
import { PremiumButton } from '../../components/PremiumButton';
import { Colors } from '../../constants/theme';
import * as Location from 'expo-location';
import { Notifications } from '../../services/notificationService';

export default function PermissionsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { showToast } = useUIStore();

    const [locationGranted, setLocationGranted] = useState(false);
    const [notificationsGranted, setNotificationsGranted] = useState(false);
    const [loading, setLoading] = useState(false);

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setLocationGranted(true);
            } else {
                showToast('Location permission is required for rides', 'warning');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const requestNotifications = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
                setNotificationsGranted(true);
            } else {
                showToast('Enable notifications to receive ride updates', 'info');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleContinue = () => {
        if (!locationGranted) {
            showToast('Please enable location to continue', 'warning');
            return;
        }
        // Proceed to role selection or home depending on the auth logic
        // Use RouteGuard usually handles post-login navigation, 
        // but if we are here we should push them to the next onboarding step.
        router.replace('/(auth)/role-selection');
    };

    return (
        <LinearGradient colors={[theme.background, theme.surface]} style={styles.container}>
            <View style={styles.contentContainer}>
                <Animated.View entering={FadeInDown.delay(200).duration(1000).springify()} style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
                        <Shield color={theme.primary} size={40} />
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>Permissions</Text>
                    <Text style={[styles.subtitle, { color: theme.icon, textAlign: 'center' }]}>
                        Detour needs a few permissions to provide you with the best ride experience.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(400).duration(1000).springify()} style={{ width: '100%' }}>
                    <GlassCard intensity={80} variant="default" style={styles.glassCard}>
                        <View style={styles.form}>
                            
                            {/* Location Permission */}
                            <TouchableOpacity 
                                style={[styles.permissionRow, { borderColor: theme.border }]} 
                                onPress={requestLocation}
                                disabled={locationGranted}
                            >
                                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                    <MapPin color="#3b82f6" size={24} />
                                </View>
                                <View style={styles.permissionTextContainer}>
                                    <Text style={[styles.permissionTitle, { color: theme.text }]}>Location</Text>
                                    <Text style={[styles.permissionDesc, { color: theme.icon }]}>Required to request and track rides</Text>
                                </View>
                                {locationGranted ? (
                                    <CheckCircle color={theme.primary} size={24} />
                                ) : (
                                    <Text style={[styles.actionText, { color: theme.primary }]}>Allow</Text>
                                )}
                            </TouchableOpacity>

                            {/* Notification Permission */}
                            <TouchableOpacity 
                                style={[styles.permissionRow, { borderColor: theme.border }]} 
                                onPress={requestNotifications}
                                disabled={notificationsGranted}
                            >
                                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                                    <Bell color="#8b5cf6" size={24} />
                                </View>
                                <View style={styles.permissionTextContainer}>
                                    <Text style={[styles.permissionTitle, { color: theme.text }]}>Notifications</Text>
                                    <Text style={[styles.permissionDesc, { color: theme.icon }]}>Get updates about your driver and trip</Text>
                                </View>
                                {notificationsGranted ? (
                                    <CheckCircle color={theme.primary} size={24} />
                                ) : (
                                    <Text style={[styles.actionText, { color: theme.primary }]}>Allow</Text>
                                )}
                            </TouchableOpacity>

                        </View>
                    </GlassCard>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(600).duration(1000).springify()} style={styles.footer}>
                    <PremiumButton
                        title="Continue"
                        onPress={handleContinue}
                        disabled={!locationGranted}
                    />
                </Animated.View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 6,
        boxShadow: '0px 8px 24px rgba(0,0,0,0.12)',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.8,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    glassCard: {
        borderRadius: 24,
        width: '100%',
        padding: 20,
    },
    form: {
        gap: 16,
    },
    permissionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    permissionTextContainer: {
        flex: 1,
    },
    permissionTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    permissionDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    actionText: {
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        width: '100%',
        marginTop: 32,
    }
});
