import CardStatItem from '@/components/ui/CardStatItem';
import { useUIStore } from '@/store/useUIStore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    Car,
    ChevronRight,
    Clock,
    CreditCard,
    FileText,
    Lock,
    LogOut,
    ShieldCheck,
    Star,
    Trash2,
    User,
    UserCog
} from 'lucide-react-native';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useDeleteAccount, useLogout } from '../../hooks/api/useAuthQueries';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { setRole, user, verificationStatus } = useAuthStore();
    const { mutate: logout } = useLogout();
    const { mutateAsync: deleteAccount } = useDeleteAccount();
    const { showToast, showConfirm } = useUIStore();

    const handleSignOut = async () => {
        showConfirm({
            title: "Sign Out",
            message: "Are you sure you want to sign out?",
            confirmText: "Sign Out",
            cancelText: "Cancel",
            onConfirm: async () => {
                try {
                    logout();
                    router.replace('/(auth)/login');
                } catch (error) {
                    console.error(error);
                    showToast("Failed to sign out", 'error');
                }
            }
        });
    };

    const handleDeleteAccount = async () => {
        if (!user?.email) return;

        showConfirm({
            title: "Delete Account",
            message: "This action cannot be undone. Please type your email to confirm.",
            confirmText: "Delete Account",
            cancelText: "Cancel",
            validationText: user.email,
            onConfirm: async () => {
                try {
                    await deleteAccount();
                    router.replace('/(auth)/login');
                    showToast("Account deleted successfully", 'success');
                } catch (error: any) {
                    console.error(error);
                    showToast(error.message || "Failed to delete account", 'error');
                }
            }
        });
    };

    const StatusBadge = () => {
        const getStatusColor = () => {
            switch (verificationStatus) {
                case 'verified': return '#22c55e'; // green-500
                case 'pending': return '#eab308'; // yellow-500
                case 'rejected': return '#ef4444'; // red-500
                default: return theme.icon;
            }
        };

        return (
            <Animated.View
                entering={FadeInDown.delay(200).springify()}
                style={[styles.badge, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}
            >
                {verificationStatus === 'verified' && <ShieldCheck size={12} color={getStatusColor()} style={{ marginRight: 4 }} />}
                <Text style={[styles.badgeText, { color: getStatusColor() }]}>
                    {verificationStatus ? verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1) : 'Unverified'}
                </Text>
            </Animated.View>
        );
    };

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, destructive = false, showChevron = true, index }: {
        icon: any;
        title: string;
        subtitle?: string;
        onPress: () => void;
        destructive?: boolean;
        showChevron?: boolean;
        index: number;
    }) => (
        <Animated.View entering={FadeInDown.delay(400 + (index * 50)).springify()}>
            <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: theme.border + '40' }]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={[styles.menuIconContainer, { backgroundColor: destructive ? '#ef444410' : theme.background }]}>
                    <Icon size={20} color={destructive ? '#ef4444' : theme.primary} />
                </View>
                <View style={styles.menuContent}>
                    <Text style={[styles.menuTitle, { color: destructive ? '#ef4444' : theme.text }]}>{title}</Text>
                    {subtitle && <Text style={[styles.menuSubtitle, { color: theme.icon }]}>{subtitle}</Text>}
                </View>
                {showChevron && <ChevronRight size={18} color={theme.icon} style={{ opacity: 0.5 }} />}
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
            {/* Header / User Info */}
            <LinearGradient
                colors={[theme.primary + '20', theme.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.avatarContainer, { shadowColor: theme.primary }]}>
                        <LinearGradient
                            colors={[theme.primary, theme.secondary || theme.primary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.avatarBorder}
                        >
                            <View style={[styles.avatar, { backgroundColor: theme.surface }]}>
                                {user?.photoURL ? (
                                    <Image source={{ uri: user.photoURL }} style={styles.avatarImage} contentFit="cover" transition={500} />
                                ) : (
                                    <Text style={[styles.avatarInitials, { color: theme.primary }]}>
                                        {user?.fullName
                                            ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                            : 'U'}
                                    </Text>
                                )}
                            </View>
                        </LinearGradient>
                        <TouchableOpacity
                            style={[styles.editBadge, { backgroundColor: theme.primary, borderColor: theme.surface }]}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <UserCog size={14} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.Text entering={FadeInDown.delay(150).springify()} style={[styles.userName, { color: theme.text }]}>
                        {user?.fullName || 'Traveler'}
                    </Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(180).springify()} style={[styles.userEmail, { color: theme.icon }]}>
                        {user?.email || 'user@example.com'}
                    </Animated.Text>

                    <View style={{ marginTop: 8 }}>
                        <StatusBadge />
                    </View>
                </View>
            </LinearGradient>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <CardStatItem
                    label="Trips"
                    value="12"
                    icon={Car}
                    index={0}
                />
                <CardStatItem
                    label="Rating"
                    value="4.9"
                    icon={Star}
                    index={1}
                />
                <CardStatItem
                    label="Hours"
                    value="48"
                    icon={Clock}
                    index={2}
                />
            </View>

            {/* Menu Groups */}
            <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Account</Text>
                <View style={[styles.menuGroup, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                    <MenuItem
                        icon={User}
                        title="Edit Profile"
                        subtitle="Personal details"
                        onPress={() => router.push('/edit-profile')}
                        index={0}
                    />
                    <MenuItem
                        icon={Lock}
                        title="Change Password"
                        subtitle="Update your security"
                        onPress={() => router.push('/change-password')}
                        index={1}
                    />
                    <MenuItem
                        icon={CreditCard}
                        title="My Wallet"
                        subtitle="Payment methods & history"
                        onPress={() => showToast('Wallet feature is under development', 'info')}
                        showChevron={true}
                        index={2}
                    />
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Support</Text>
                <View style={[styles.menuGroup, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                    <MenuItem
                        icon={AlertCircle}
                        title="Support & Reclamations"
                        subtitle="Get help with your trips"
                        onPress={() => showToast('Contact support@detour.app', 'info')}
                        index={0}
                    />
                    <MenuItem
                        icon={FileText}
                        title="Terms of Service"
                        onPress={() => showToast('Terms of Service content goes here', 'info')}
                        showChevron={true}
                        index={1}
                    />
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>App</Text>
                <View style={[styles.menuGroup, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                    <MenuItem
                        icon={Car}
                        title="Switch to Driver Mode"
                        subtitle="Start earning today"
                        onPress={() => setRole(null)}
                        index={0}
                    />
                    <MenuItem
                        icon={LogOut}
                        title="Sign Out"
                        destructive
                        onPress={handleSignOut}
                        showChevron={false}
                        index={1}
                    />
                    <MenuItem
                        icon={Trash2}
                        title="Delete Account"
                        destructive
                        onPress={handleDeleteAccount}
                        showChevron={false}
                        index={2}
                    />
                </View>
            </Animated.View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingTop: 80,
        paddingBottom: 40,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 20,
    },
    headerContent: {
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    avatarBorder: {
        padding: 4,
        borderRadius: 60,
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitials: {
        fontSize: 40,
        fontWeight: 'bold',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    userName: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 4,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    userEmail: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 16,
        opacity: 0.7,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        gap: 20,
        marginBottom: 32,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.6,
    },
    section: {
        marginBottom: 28,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 12,
        opacity: 0.5,
    },
    menuGroup: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    menuIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.6,
    },
});
