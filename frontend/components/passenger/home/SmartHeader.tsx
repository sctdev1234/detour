import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Bell, MapPin, Navigation } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/theme';
import { useAuthStore } from '../../../store/useAuthStore';

interface SmartHeaderProps {
    homeState: 'idle' | 'searching' | 'active';
    pendingOffersCount: number;
    currentAddress?: string;
    driverStatusText?: string;
}

export default function SmartHeader({ homeState, pendingOffersCount, currentAddress, driverStatusText }: SmartHeaderProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const { user } = useAuthStore();

    return (
        <Animated.View 
            entering={FadeIn.duration(400)} 
            exiting={FadeOut.duration(400)}
            style={[styles.container, { paddingTop: insets.top + 12 }]}
        >
            <BlurView intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={styles.blur}>
                {/* User Profile / Context Area */}
                <TouchableOpacity 
                    style={styles.leftContent} 
                    onPress={() => router.push('/(client)/profile')}
                    activeOpacity={0.7}
                >
                    {user?.photoURL ? (
                        <Animated.Image source={{ uri: user.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
                            <Text style={styles.avatarText}>
                                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.textContainer}>
                        {homeState === 'idle' && (
                            <>
                                <Text style={[styles.greeting, { color: theme.text }]}>Good Morning, {user?.fullName?.split(' ')[0] || 'User'}</Text>
                                <View style={styles.locationRow}>
                                    <MapPin size={12} color={theme.text + '80'} />
                                    <Text style={[styles.address, { color: theme.text + '80' }]} numberOfLines={1}>
                                        {currentAddress || 'Locating...'}
                                    </Text>
                                </View>
                            </>
                        )}
                        {homeState === 'searching' && (
                            <>
                                <Text style={[styles.greeting, { color: theme.text }]}>Looking for rides...</Text>
                                <Text style={[styles.address, { color: theme.text + '80' }]}>Broadcasting to nearby drivers</Text>
                            </>
                        )}
                        {homeState === 'active' && (
                            <>
                                <Text style={[styles.greeting, { color: theme.primary }]}>{driverStatusText || 'Driver Assigned'}</Text>
                                <View style={styles.locationRow}>
                                    <Navigation size={12} color={theme.text + '80'} />
                                    <Text style={[styles.address, { color: theme.text + '80' }]} numberOfLines={1}>
                                        Trip in progress
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Notifications / Actions */}
                <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: isDark ? '#2c2c2e80' : '#f2f2f780' }]} 
                    onPress={() => router.push('/(client)/requests')}
                >
                    <Bell size={20} color={theme.text} />
                    {pendingOffersCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingOffersCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        zIndex: 100,
    },
    blur: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 24,
        padding: 8,
        paddingRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarFallback: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    textContainer: {
        marginLeft: 12,
        justifyContent: 'center',
        flex: 1,
    },
    greeting: {
        fontSize: 15,
        fontWeight: '700',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    address: {
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '500',
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#FF3B30',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },
});
