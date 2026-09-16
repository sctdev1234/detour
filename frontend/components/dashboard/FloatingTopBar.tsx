import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, Menu, Map, Users } from 'lucide-react-native';
import React from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useDriverRequests } from '../../hooks/api/useTripQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface FloatingTopBarProps {
    onMenuPress: () => void;
    driverRoutesCount?: number;
    matchedClientsCount?: number;
}

export default function FloatingTopBar({ onMenuPress, driverRoutesCount = 0, matchedClientsCount = 0 }: FloatingTopBarProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { driverStatus } = useDashboardStore();

    const { data: requests } = useDriverRequests();
    const pendingCount = requests?.filter((r: any) => r.status === 'pending').length || 0;

    const isOnline = driverStatus === 'ONLINE';

    // Greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios'
        ? { intensity: 80, tint: colorScheme }
        : {};

    return (
        <View style={[styles.wrapper, { top: insets.top + 10 }]}>
            <Container
                {...containerProps}
                style={[
                    styles.container,
                    Platform.OS !== 'ios' && {
                        backgroundColor: colorScheme === 'dark'
                            ? 'rgba(28, 28, 30, 0.92)'
                            : 'rgba(255, 255, 255, 0.92)',
                    }
                ]}
            >
                {/* Hamburger */}
                <TouchableOpacity
                    style={[styles.iconBtn, {
                        backgroundColor: colorScheme === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.05)'
                    }]}
                    onPress={onMenuPress}
                    activeOpacity={0.7}
                >
                    <Menu size={20} color={theme.text} strokeWidth={2.5} />
                </TouchableOpacity>

                {/* Center: Status */}
                <TouchableOpacity
                    style={styles.centerSection}
                    onPress={() => router.push('/(driver)/profile')}
                    activeOpacity={0.8}
                >
                    {/* Mini Avatar */}
                    <View style={[styles.miniAvatar, { borderColor: isOnline ? '#34D399' : theme.border }]}>
                        {user?.photoURL ? (
                            <Image
                                source={{ uri: user.photoURL }}
                                style={styles.miniAvatarImage}
                                contentFit="cover"
                            />
                        ) : (
                            <Text style={[styles.miniAvatarText, { color: theme.primary }]}>
                                {user?.fullName?.[0]?.toUpperCase() || 'D'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.greetingContainer}>
                        <Text style={[styles.greetingText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {greeting},
                        </Text>
                        <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
                            {user?.fullName?.split(' ')[0] || 'Driver'}
                        </Text>
                    </View>

                    {/* Status dot */}
                    <View style={[
                        styles.statusChip,
                        {
                            backgroundColor: isOnline
                                ? 'rgba(52, 211, 153, 0.12)'
                                : 'rgba(156, 163, 175, 0.12)'
                        }
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: isOnline ? '#34D399' : '#9CA3AF' }
                        ]} />
                    </View>
                </TouchableOpacity>

                {/* Notification */}
                <TouchableOpacity
                    style={[styles.iconBtn, {
                        backgroundColor: colorScheme === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.05)'
                    }]}
                    onPress={() => router.push('/notifications')}
                    activeOpacity={0.7}
                >
                    <Bell size={20} color={theme.text} strokeWidth={2} />
                    {pendingCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: theme.primary, borderColor: theme.surface }]}>
                            <Text style={styles.badgeText}>
                                {pendingCount > 9 ? '9+' : pendingCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Container>

            {/* Floating Stats Badges (Glassmorphic) */}
            <Animated.View 
                entering={FadeInUp.delay(300).springify().damping(14)}
                style={styles.statsRow}
                pointerEvents="box-none"
            >
                <Container
                    {...containerProps}
                    style={[
                        styles.statBadge,
                        Platform.OS !== 'ios' && {
                            backgroundColor: colorScheme === 'dark' ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)'
                        }
                    ]}
                >
                    <Map size={14} color="#3B82F6" strokeWidth={2.5} />
                    <Text style={[styles.statText, { color: theme.text }]}>
                        <Text style={{ fontWeight: '800' }}>{driverRoutesCount}</Text> Route{driverRoutesCount !== 1 ? 's' : ''}
                    </Text>
                </Container>

                <Container
                    {...containerProps}
                    style={[
                        styles.statBadge,
                        Platform.OS !== 'ios' && {
                            backgroundColor: colorScheme === 'dark' ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)'
                        }
                    ]}
                >
                    <Users size={14} color="#10B981" strokeWidth={2.5} />
                    <Text style={[styles.statText, { color: theme.text }]}>
                        <Text style={{ fontWeight: '800' }}>{matchedClientsCount}</Text> Client{matchedClientsCount !== 1 ? 's' : ''}
                    </Text>
                </Container>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 100,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderRadius: 24,
        gap: 8,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 4,
    },
    miniAvatar: {
        width: 32,
        height: 32,
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    miniAvatarImage: {
        width: '100%',
        height: '100%',
    },
    miniAvatarText: {
        fontSize: 14,
        fontWeight: '800',
    },
    greetingContainer: {
        flex: 1,
    },
    greetingText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    nameText: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    statusChip: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        paddingHorizontal: 8,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
