import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Bell,
    ChevronRight,
    Globe,
    Info,
    MapPin,
    Moon,
    Shield,
    Smartphone
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Platform
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import Constants from 'expo-constants';

export default function SettingsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { showToast } = useUIStore();

    // Local state for toggles (to be connected to actual stores/APIs)
    const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
    const [pushNotifications, setPushNotifications] = useState(true);
    const [locationAccess, setLocationAccess] = useState(true);

    const handleToggleDark = (value: boolean) => {
        setIsDarkMode(value);
        showToast('Theme switching is controlled by system settings', 'info');
    };

    const handleTogglePush = (value: boolean) => {
        setPushNotifications(value);
        showToast(`Push notifications ${value ? 'enabled' : 'disabled'}`, 'success');
    };

    const handleToggleLocation = (value: boolean) => {
        setLocationAccess(value);
        showToast(`Location access ${value ? 'enabled' : 'disabled'}`, 'success');
    };

    const SettingRow = ({ 
        icon: Icon, 
        title, 
        subtitle, 
        type = 'link', 
        value, 
        onValueChange, 
        onPress,
        index 
    }: any) => (
        <Animated.View entering={FadeInDown.delay(100 + (index * 50)).springify()}>
            <TouchableOpacity
                style={[styles.settingRow, { borderBottomColor: theme.border + '40' }]}
                onPress={onPress}
                activeOpacity={type === 'link' ? 0.7 : 1}
                disabled={type === 'toggle'}
            >
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <Icon size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
                    {subtitle && <Text style={[styles.settingSubtitle, { color: theme.icon }]}>{subtitle}</Text>}
                </View>
                
                {type === 'toggle' ? (
                    <Switch
                        value={value}
                        onValueChange={onValueChange}
                        trackColor={{ false: theme.border, true: theme.primary }}
                        thumbColor={Platform.OS === 'ios' ? '#fff' : (value ? '#fff' : '#f4f3f4')}
                    />
                ) : (
                    <View style={styles.linkRight}>
                        {value && <Text style={[styles.linkValue, { color: theme.icon }]}>{value}</Text>}
                        <ChevronRight size={18} color={theme.icon} style={{ opacity: 0.5 }} />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <LinearGradient
                colors={[theme.primary + '20', theme.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <Animated.Text entering={FadeInDown.delay(100).springify()} style={[styles.headerTitle, { color: theme.text }]}>
                        Settings
                    </Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(150).springify()} style={[styles.headerSubtitle, { color: theme.icon }]}>
                        Manage your preferences
                    </Animated.Text>
                </View>
            </LinearGradient>

            {/* Preferences */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Preferences</Text>
                <View style={[styles.settingGroup, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                    <SettingRow
                        icon={Moon}
                        title="Dark Mode"
                        subtitle="Follows system setting"
                        type="toggle"
                        value={isDarkMode}
                        onValueChange={handleToggleDark}
                        index={0}
                    />
                    <SettingRow
                        icon={Globe}
                        title="Language"
                        value="English"
                        onPress={() => showToast('Language selection coming soon', 'info')}
                        index={1}
                    />
                </View>
            </View>

            {/* Permissions */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Permissions</Text>
                <View style={[styles.settingGroup, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                    <SettingRow
                        icon={Bell}
                        title="Push Notifications"
                        subtitle="Ride updates and promos"
                        type="toggle"
                        value={pushNotifications}
                        onValueChange={handleTogglePush}
                        index={0}
                    />
                    <SettingRow
                        icon={MapPin}
                        title="Location Access"
                        subtitle="Required for accurate pickups"
                        type="toggle"
                        value={locationAccess}
                        onValueChange={handleToggleLocation}
                        index={1}
                    />
                </View>
            </View>

            {/* Privacy & Legal */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Privacy & Legal</Text>
                <View style={[styles.settingGroup, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                    <SettingRow
                        icon={Shield}
                        title="Privacy Policy"
                        onPress={() => showToast('Privacy Policy opening...', 'info')}
                        index={0}
                    />
                    <SettingRow
                        icon={Info}
                        title="Terms of Service"
                        onPress={() => showToast('Terms of Service opening...', 'info')}
                        index={1}
                    />
                </View>
            </View>

            {/* App Info */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>About App</Text>
                <View style={[styles.settingGroup, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                    <SettingRow
                        icon={Smartphone}
                        title="App Version"
                        value={Constants.expoConfig?.version || '1.0.0'}
                        onPress={() => showToast(`Detour v${Constants.expoConfig?.version || '1.0.0'}`, 'info')}
                        index={0}
                    />
                </View>
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingTop: 60,
        paddingBottom: 30,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 20,
    },
    headerContent: {
        paddingHorizontal: 24,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Inter-Bold',
        fontWeight: '700',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        opacity: 0.8,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        fontWeight: '600',
        marginLeft: 16,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    settingGroup: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingContent: {
        flex: 1,
        justifyContent: 'center',
    },
    settingTitle: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        fontWeight: '600',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
    },
    linkRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    linkValue: {
        fontSize: 15,
        fontFamily: 'Inter-Medium',
        marginRight: 8,
    },
});
