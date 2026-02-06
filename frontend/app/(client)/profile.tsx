import { useUIStore } from '@/store/useUIStore';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    Car,
    ChevronRight,
    Clock,
    CreditCard,
    FileText,
    LogOut,
    ShieldCheck,
    Star,
    Trash2,
    User,
    UserCog
} from 'lucide-react-native';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { logout, setRole, user, verificationStatus, deleteAccount } = useAuthStore();
    const { showToast, showConfirm } = useUIStore();

    const handleSignOut = async () => {
        showConfirm(
            "Sign Out",
            "Are you sure you want to sign out?",
            async () => {
                try {
                    logout();
                    router.replace('/(auth)/login');
                } catch (error) {
                    console.error(error);
                    showToast("Failed to sign out", 'error');
                }
            },
            () => { }, // cancel
            "Sign Out",
            "Cancel"
        );
    };

    const handleDeleteAccount = async () => {
        if (!user?.email) return;

        showConfirm(
            "Delete Account",
            "This action cannot be undone. Please type your email to confirm.",
            async () => {
                try {
                    await deleteAccount();
                    router.replace('/(auth)/login');
                    showToast("Account deleted successfully", 'success');
                } catch (error: any) {
                    console.error(error);
                    showToast(error.message || "Failed to delete account", 'error');
                }
            },
            () => { }, // cancel
            "Delete Account",
            "Cancel",
            user.email // validation text
        );
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
            <View style={[styles.badge, { backgroundColor: getStatusColor() + '15', borderColor: getStatusColor() }]}>
                {verificationStatus === 'verified' && <ShieldCheck size={12} color={getStatusColor()} style={{ marginRight: 4 }} />}
                <Text style={[styles.badgeText, { color: getStatusColor() }]}>
                    {verificationStatus ? verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1) : 'Unverified'}
                </Text>
            </View>
        );
    };

    const StatBox = ({ label, value, icon: Icon }: { label: string, value: string, icon: any }) => (
        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primary + '15' }]}>
                <Icon size={16} color={theme.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.icon }]}>{label}</Text>
        </View>
    );

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, destructive = false, showChevron = true }: {
        icon: any;
        title: string;
        subtitle?: string;
        onPress: () => void;
        destructive?: boolean;
        showChevron?: boolean;
    }) => (
        <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.menuIconContainer, { backgroundColor: destructive ? '#ef444415' : theme.background }]}>
                <Icon size={20} color={destructive ? '#ef4444' : theme.primary} />
            </View>
            <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: destructive ? '#ef4444' : theme.text }]}>{title}</Text>
                {subtitle && <Text style={[styles.menuSubtitle, { color: theme.icon }]}>{subtitle}</Text>}
            </View>
            {showChevron && <ChevronRight size={18} color={theme.icon} />}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
            {/* Header / User Info */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <View style={[styles.avatar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        {user?.photoURL ? (
                            <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                        ) : (
                            <User size={40} color={theme.icon} />
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.editBadge, { backgroundColor: theme.primary, borderColor: theme.background }]}
                        onPress={() => router.push('/(client)/edit-profile')}
                    >
                        <UserCog size={14} color="#fff" />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.userName, { color: theme.text }]}>
                    {user?.fullName || 'Traveler'}
                </Text>
                <Text style={[styles.userEmail, { color: theme.icon }]}>
                    {user?.email || 'user@example.com'}
                </Text>

                <View style={{ marginTop: 8 }}>
                    <StatusBadge />
                </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <StatBox label="Trips" value="12" icon={Car} />
                <StatBox label="Rating" value="4.9" icon={Star} />
                <StatBox label="Hours" value="48" icon={Clock} />
            </View>

            {/* Menu Groups */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Account</Text>
                <MenuItem
                    icon={User}
                    title="Edit Profile"
                    subtitle="Personal details"
                    onPress={() => router.push('/(client)/edit-profile')}
                />
                <MenuItem
                    icon={CreditCard}
                    title="My Wallet"
                    subtitle="Payment methods & history"
                    onPress={() => showToast('Wallet feature is under development', 'info')}
                />
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Support</Text>
                <MenuItem
                    icon={AlertCircle}
                    title="Support & Reclamations"
                    subtitle="Get help with your trips"
                    onPress={() => showToast('Contact support@detour.app', 'info')}
                />
                <MenuItem
                    icon={FileText}
                    title="Terms of Service"
                    onPress={() => showToast('Terms of Service content goes here', 'info')}
                />
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>App</Text>
                <MenuItem
                    icon={Car}
                    title="Switch to Driver Mode"
                    subtitle="Start earning today"
                    onPress={() => setRole(null)} // Reset role to force selection or switch
                />
                <MenuItem
                    icon={LogOut}
                    title="Sign Out"
                    destructive
                    onPress={handleSignOut}
                    showChevron={false}
                />
                <MenuItem
                    icon={Trash2}
                    title="Delete Account"
                    destructive
                    onPress={handleDeleteAccount}
                    showChevron={false}
                />
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        boxShadow: '0px 8px 20px rgba(0,0,0,0.1)',
        elevation: 8,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        boxShadow: '0px 4px 10px rgba(0,0,0,0.15)',
        elevation: 5,
    },
    userName: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 4,
        textAlign: 'center',
    },
    userEmail: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 16,
        opacity: 0.6,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        gap: 16,
        marginBottom: 40,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        gap: 10,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.03)',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    section: {
        marginBottom: 32,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginLeft: 4,
        opacity: 0.6,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.02)',
    },
    menuIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.7,
    },
});

