import { DrawerContentScrollView } from '@react-navigation/drawer';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Bell,
    Car,
    ChevronRight,
    History,
    LayoutDashboard,
    LogOut,
    Settings,
    Star,
    User,
    Wallet
} from 'lucide-react-native';
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
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useDashboardStore } from '../store/useDashboardStore';

interface MenuItem {
    icon: any;
    label: string;
    route?: string;
    onPress?: () => void;
    badge?: number;
}

export default function DrawerContent(props: any) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user, logout } = useAuthStore();
    const { driverStatus } = useDashboardStore();

    const menuItems: MenuItem[] = [
        {
            icon: LayoutDashboard,
            label: 'Dashboard',
            route: '/(driver)',
        },
        {
            icon: Car,
            label: 'Cars',
            route: '/(driver)/cars',
        },
        {
            icon: Bell,
            label: 'Notifications',
            route: '/notifications',
        },
        {
            icon: Wallet,
            label: 'Wallet',
            route: '/finance/wallet',
        },
        {
            icon: History,
            label: 'Trips History',
            route: '/trips',
        },
        {
            icon: Settings,
            label: 'Settings',
            route: '/edit-profile',
        },
    ];

    const handleMenuPress = (item: MenuItem) => {
        if (item.onPress) {
            item.onPress();
        } else if (item.route) {
            // Close drawer first then navigate
            props.navigation.closeDrawer();
            setTimeout(() => {
                router.push(item.route as any);
            }, 300);
        }
    };

    const handleLogout = () => {
        props.navigation.closeDrawer();
        logout();
        router.replace('/(auth)/login');
    };

    const isOnline = driverStatus === 'online';

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Profile Header */}
            <LinearGradient
                colors={colorScheme === 'dark'
                    ? ['#1a1a2e', '#16213e']
                    : ['#667eea', '#764ba2']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 20 }]}
            >
                {/* Background decoration */}
                <View style={styles.headerBgCircle1} />
                <View style={styles.headerBgCircle2} />

                <TouchableOpacity
                    style={styles.profileSection}
                    onPress={() => {
                        props.navigation.closeDrawer();
                        router.push('/(driver)/profile');
                    }}
                    activeOpacity={0.8}
                >
                    {/* Avatar */}
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarContainer}>
                            {user?.photoURL ? (
                                <Image
                                    source={{ uri: user.photoURL }}
                                    style={styles.avatarImage}
                                    contentFit="cover"
                                    transition={300}
                                />
                            ) : (
                                <Text style={styles.avatarFallback}>
                                    {user?.fullName?.[0]?.toUpperCase() || 'D'}
                                </Text>
                            )}
                        </View>
                        {/* Online Status Indicator */}
                        <View style={[
                            styles.statusIndicator,
                            { backgroundColor: isOnline ? '#34D399' : '#9CA3AF' }
                        ]} />
                    </View>

                    {/* Driver Info */}
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName} numberOfLines={1}>
                            {user?.fullName || 'Driver'}
                        </Text>
                        <View style={styles.ratingRow}>
                            <Star size={14} color="#FFD700" fill="#FFD700" />
                            <Text style={styles.ratingText}>
                                {(user?.stats?.rating || 4.8).toFixed(1)}
                            </Text>
                            <View style={[
                                styles.statusPill,
                                { backgroundColor: isOnline ? 'rgba(52, 211, 153, 0.2)' : 'rgba(156, 163, 175, 0.2)' }
                            ]}>
                                <View style={[
                                    styles.statusDotSmall,
                                    { backgroundColor: isOnline ? '#34D399' : '#9CA3AF' }
                                ]} />
                                <Text style={[
                                    styles.statusLabel,
                                    { color: isOnline ? '#34D399' : '#D1D5DB' }
                                ]}>
                                    {isOnline ? 'Online' : 'Offline'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View>
                        <Text style={styles.balanceLabel}>WALLET BALANCE</Text>
                        <Text style={styles.balanceValue}>
                            {user?.balance?.toFixed(0) || '0'} MAD
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.topUpBtn}
                        onPress={() => {
                            props.navigation.closeDrawer();
                            router.push('/finance/wallet');
                        }}
                    >
                        <Text style={styles.topUpText}>Top Up</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Menu Items */}
            <DrawerContentScrollView
                {...props}
                contentContainerStyle={styles.menuContainer}
                showsVerticalScrollIndicator={false}
            >
                {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = false; // Could check current route

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.menuItem,
                                isActive && { backgroundColor: theme.primary + '10' }
                            ]}
                            onPress={() => handleMenuPress(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.menuIconBox,
                                {
                                    backgroundColor: isActive
                                        ? theme.primary + '15'
                                        : colorScheme === 'dark'
                                            ? 'rgba(255,255,255,0.05)'
                                            : 'rgba(0,0,0,0.04)'
                                }
                            ]}>
                                <Icon
                                    size={20}
                                    color={isActive ? theme.primary : theme.icon}
                                />
                            </View>
                            <Text style={[
                                styles.menuLabel,
                                {
                                    color: isActive ? theme.primary : theme.text,
                                    fontWeight: isActive ? '700' : '600'
                                }
                            ]}>
                                {item.label}
                            </Text>
                            {item.badge && item.badge > 0 ? (
                                <View style={[styles.menuBadge, { backgroundColor: theme.primary }]}>
                                    <Text style={styles.menuBadgeText}>
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </Text>
                                </View>
                            ) : (
                                <ChevronRight
                                    size={16}
                                    color={theme.icon}
                                    style={{ opacity: 0.4 }}
                                />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </DrawerContentScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <View style={[styles.logoutIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
                        <LogOut size={18} color="#EF4444" />
                    </View>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: theme.icon }]}>
                    Detour v1.0.0
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Header
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    headerBgCircle1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerBgCircle2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 14,
    },
    avatarContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#764ba2',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    ratingText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '700',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusDotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusLabel: {
        fontSize: 11,
        fontWeight: '700',
    },
    // Balance Card
    balanceCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backdropFilter: 'blur(10px)',
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 2,
    },
    balanceValue: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    topUpBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    topUpText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    // Menu
    menuContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginBottom: 4,
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        letterSpacing: -0.2,
    },
    menuBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    menuBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    // Footer
    footer: {
        borderTopWidth: 1,
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingBottom: 32,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    logoutIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '700',
    },
    version: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.5,
    },
});
