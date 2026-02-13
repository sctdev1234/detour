import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

type Role = 'driver' | 'client' | null;

export default function Header() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const pathname = usePathname();
    const segments = useSegments();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user, role } = useAuthStore();

    const Container = Platform.OS === 'ios' ? BlurView : View;

    // Compact height calculation
    const HEADER_CONTENT_HEIGHT = 60;
    const TOTAL_HEIGHT = HEADER_CONTENT_HEIGHT + insets.top;

    const containerStyle = Platform.OS === 'ios'
        ? [
            styles.container,
            { height: TOTAL_HEIGHT, paddingTop: insets.top, backgroundColor: 'transparent' }
        ]
        : [
            styles.container,
            {
                height: TOTAL_HEIGHT,
                paddingTop: insets.top,
                backgroundColor: theme.surface,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(0,0,0,0.05)',
                elevation: 0 // Remove elevation for cleaner look
            }
        ];

    // Helper to determine if we should show back button
    // We hide it on main tab screens and auth roots
    const isMainTab = () => {
        // Home
        if (pathname === '/' || pathname === '/index') return true;

        // Driver Tabs
        if (pathname === '/(driver)' || pathname === '/(driver)/' || pathname === '/(driver)/index') return true;
        if (pathname.includes('/(driver)/cars') && !pathname.includes('/add-car') && !pathname.includes('/assign-car')) return true; // Main cars list is tab
        if (pathname.includes('/(driver)/requests')) return true;
        if (pathname.includes('/(driver)/routes') && !pathname.includes('/add-route')) return true;
        if (pathname.includes('/(driver)/trips')) return true;
        if (pathname.includes('/(driver)/profile')) return true;

        // Client Tabs (Assuming similar structure based on previous context)
        if (pathname === '/(client)' || pathname === '/(client)/' || pathname === '/(client)/index') return true;
        if (pathname.includes('/(client)/requests')) return true;
        if (pathname.includes('/(client)/profile')) return true;
        if (pathname.includes('/(client)/routes') && !pathname.includes('/add-route')) return true;
        if (pathname.includes('/(client)/trips')) return true;
        if (pathname.includes('/(client)/places')) return true;

        // Auth
        if (pathname.includes('/(auth)/login')) return true;
        if (pathname.includes('/(auth)/role-selection')) return true;
        if (pathname.includes('/tasks')) return true; // Tasks is a root-like screen
        if (pathname.includes('/(auth)/signup')) return false; // Signup usually has back to login

        return false;
    };

    const showBackButton = !isMainTab() && router.canGoBack();

    // Profile navigation
    const handleProfilePress = () => {
        if (role === 'driver') router.push('/(driver)/profile');
        else if (role === 'client') router.push('/(client)/profile');
        else router.push('/(auth)/login');
    };

    // Hide global header on main tabs as they implement their own custom headers
    // EXCEPT for the main dashboard indexes where we want to use this header
    const isDashboard = pathname === '/' || pathname === '/index' ||
        pathname === '/(driver)' || pathname === '/(driver)/' || pathname === '/(driver)/index' ||
        pathname === '/(client)' || pathname === '/(client)/' || pathname === '/(client)/index';

    if (isMainTab() && !isDashboard) {
        return null;
    }

    return (
        <Container intensity={90} tint={colorScheme} style={containerStyle}>
            <View style={styles.content}>
                {/* Left: Back Button OR Identity */}
                {showBackButton ? (
                    <TouchableOpacity
                        style={styles.backButtonData}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.backIconContainer, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                            <ChevronLeft size={22} color={theme.text} strokeWidth={2.5} />
                        </View>
                        <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.identityContainer}
                        onPress={handleProfilePress}
                        activeOpacity={0.7}
                    >
                        {/* Avatar */}
                        <View style={[styles.avatarContainer, { borderColor: 'rgba(0,0,0,0.05)', backgroundColor: theme.background }]}>
                            {user?.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} contentFit="cover" transition={500} />
                            ) : (
                                <Text style={[styles.avatarFallbackText, { color: theme.primary }]}>
                                    {user?.fullName?.[0] || 'U'}
                                </Text>
                            )}
                        </View>

                        {/* Text Stack */}
                        <View style={styles.textStack}>
                            <Text style={[styles.greeting, { color: 'rgba(107, 114, 128, 1)' }]}>Good Morning,</Text>
                            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                                {user?.fullName?.split(' ')[0] || 'Guest'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Right: Status / Actions */}
                <View style={styles.actionsContainer}>
                    {/* Balance Badge */}
                    <View style={[styles.balanceBadge, { backgroundColor: theme.primary + '15' }]}>
                        <Text style={[styles.balanceText, { color: theme.primary }]}>
                            {user?.balance?.toFixed(0) || '0'} MAD
                        </Text>
                    </View>

                    {
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.03)' }]}
                            onPress={() => {
                                router.push('/requests');
                            }}
                        >
                            <Bell size={18} color={theme.text} strokeWidth={2} />
                            {/* Notification Dot */}
                            <View style={[
                                styles.notificationDot,
                                {
                                    backgroundColor: theme.primary,
                                    borderColor: theme.surface
                                }
                            ]} />
                        </TouchableOpacity>
                    }
                </View>
            </View>
        </Container>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        overflow: 'hidden', // Ensure blur doesn't leak
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    // Left Identity
    identityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatarContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarFallbackText: {
        fontSize: 16,
        fontWeight: '700',
    },
    textStack: {
        justifyContent: 'center',
        gap: -1, // Tighten vertical rhythm
    },
    greeting: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.2,
        textTransform: 'uppercase', // Premium touch
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    // Back Button
    backButtonData: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8, // Increase touch area
        paddingRight: 12,
    },
    backIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backText: {
        fontSize: 15,
        fontWeight: '600',
    },
    // Right Actions
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // Status Badge
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    // Icon Button (Client)
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1.5,
    },
    balanceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
    },
    balanceText: {
        fontSize: 12,
        fontWeight: '800',
    }
});
