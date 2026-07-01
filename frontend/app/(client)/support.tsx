import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    ChevronRight,
    HelpCircle,
    Mail,
    MessageCircle,
    PhoneCall
} from 'lucide-react-native';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Linking
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useUIStore } from '../../store/useUIStore';

export default function SupportScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { showToast } = useUIStore();

    const SupportRow = ({ 
        icon: Icon, 
        title, 
        subtitle, 
        onPress,
        index 
    }: any) => (
        <Animated.View entering={FadeInDown.delay(100 + (index * 50)).springify()}>
            <TouchableOpacity
                style={[styles.supportRow, { borderBottomColor: theme.border + '40' }]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <Icon size={20} color={theme.primary} />
                </View>
                <View style={styles.supportContent}>
                    <Text style={[styles.supportTitle, { color: theme.text }]}>{title}</Text>
                    {subtitle && <Text style={[styles.supportSubtitle, { color: theme.icon }]}>{subtitle}</Text>}
                </View>
                <ChevronRight size={18} color={theme.icon} style={{ opacity: 0.5 }} />
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
                        Help & Support
                    </Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(150).springify()} style={[styles.headerSubtitle, { color: theme.icon }]}>
                        How can we help you today?
                    </Animated.Text>
                </View>
            </LinearGradient>

            {/* Quick Help */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Quick Help</Text>
                <View style={[styles.supportGroup, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                    <SupportRow
                        icon={AlertCircle}
                        title="Report an Issue"
                        subtitle="Trip issues or complaints"
                        onPress={() => router.push('/reclamations')}
                        index={0}
                    />
                    <SupportRow
                        icon={HelpCircle}
                        title="FAQ"
                        subtitle="Frequently asked questions"
                        onPress={() => showToast('FAQ opening...', 'info')}
                        index={1}
                    />
                </View>
            </View>

            {/* Contact Us */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Contact Us</Text>
                <View style={[styles.supportGroup, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                    <SupportRow
                        icon={MessageCircle}
                        title="Live Chat"
                        subtitle="Talk with our support team"
                        onPress={() => showToast('Live chat is currently offline', 'info')}
                        index={0}
                    />
                    <SupportRow
                        icon={PhoneCall}
                        title="Call Us"
                        subtitle="Available 24/7 for emergencies"
                        onPress={() => Linking.openURL('tel:123456789')}
                        index={1}
                    />
                    <SupportRow
                        icon={Mail}
                        title="Email Support"
                        subtitle="support@detour.ma"
                        onPress={() => Linking.openURL('mailto:support@detour.ma')}
                        index={2}
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
    supportGroup: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
    },
    supportRow: {
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
    supportContent: {
        flex: 1,
        justifyContent: 'center',
    },
    supportTitle: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        fontWeight: '600',
        marginBottom: 2,
    },
    supportSubtitle: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
    },
});
