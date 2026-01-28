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
    User,
    UserCog
} from 'lucide-react-native';
import {
    Alert,
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
    const { logout, setRole, user, verificationStatus } = useAuthStore();

    const handleSignOut = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            logout();
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", "Failed to sign out");
                        }
                    }
                }
            ]
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

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, destructive = false, showChevron = true }) => (
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
                    onPress={() => Alert.alert('Coming Soon', 'Wallet feature is under development.')}
                />
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Support</Text>
                <MenuItem
                    icon={AlertCircle}
                    title="Support & Reclamations"
                    subtitle="Get help with your trips"
                    onPress={() => Alert.alert('Support', 'Contact support@detour.app')}
                />
                <MenuItem
                    icon={FileText}
                    title="Terms of Service"
                    onPress={() => Alert.alert('Terms', 'Terms of Service content goes here.')}
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
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        marginBottom: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 32,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    section: {
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
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
    },
});
