import { useUIStore } from '@/store/useUIStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Car, CheckCircle, Lock, Mail, User, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';
import { PremiumButton } from '../../components/PremiumButton';
import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useRegister } from '../../hooks/api/useAuthQueries';
import { useAuthStore } from '../../store/useAuthStore';

export default function SignupScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isOffline = useAuthStore(state => state.isOffline);

    const { mutateAsync: signup, isPending: loading } = useRegister();
    const { showToast } = useUIStore();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'client' | 'driver'>('client');

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            showToast('Please fill in all fields', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (isOffline) {
            showToast('You are currently offline', 'error');
            return;
        }

        try {
            await signup({ email, password, fullName: name, role });
            // Success - will redirect to role selection via _layout
        } catch (error: any) {
            showToast(error.message || 'Signup Failed', 'error');
        }
    };

    return (
        <LinearGradient
            colors={[theme.background, theme.surface]}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                {isOffline && (
                    <Animated.View entering={FadeInDown} style={[styles.offlineBanner, { backgroundColor: theme.error }]}>
                        <Text style={styles.offlineText}>No internet connection</Text>
                    </Animated.View>
                )}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View
                        entering={FadeInDown.delay(200).duration(1000).springify()}
                        style={styles.header}
                    >
                        <Text style={[styles.title, { color: theme.text }]}>Start Your Journey</Text>
                        <Text style={[styles.subtitle, { color: theme.icon }]}>Create your account today</Text>
                    </Animated.View>

                    <Animated.View
                        entering={FadeInUp.delay(300).duration(1000).springify()}
                        style={styles.roleContainer}
                    >
                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                { borderColor: theme.border, backgroundColor: theme.surface },
                                role === 'client' && { backgroundColor: theme.primary, borderColor: theme.primary },
                            ]}
                            onPress={() => setRole('client')}
                        >
                            <User size={24} color={role === 'client' ? '#fff' : theme.icon} />
                            <Text style={[
                                styles.roleText,
                                { color: role === 'client' ? '#fff' : theme.text }
                            ]}>Passenger</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                { borderColor: theme.border, backgroundColor: theme.surface },
                                role === 'driver' && { backgroundColor: theme.primary, borderColor: theme.primary },
                            ]}
                            onPress={() => setRole('driver')}
                        >
                            <Car size={24} color={role === 'driver' ? '#fff' : theme.icon} />
                            <Text style={[
                                styles.roleText,
                                { color: role === 'driver' ? '#fff' : theme.text }
                            ]}>Driver</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(500).duration(1000).springify()}>
                        <GlassCard intensity={80} variant="default" style={styles.glassForm}>
                            <View style={styles.form}>
                                <PremiumInput
                                    label="Full Name"
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="John Doe"
                                    icon={User}
                                />

                                <PremiumInput
                                    label="Email"
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="name@email.com"
                                    icon={Mail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />

                                <PremiumInput
                                    label="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Min 8 characters"
                                    icon={Lock}
                                    secureTextEntry
                                />

                                <PremiumInput
                                    label="Confirm Password"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Re-enter password"
                                    icon={CheckCircle}
                                    secureTextEntry
                                />

                                <PremiumButton
                                    title="Create Account"
                                    onPress={handleSignup}
                                    loading={loading}
                                    icon={UserPlus}
                                />

                                <View style={styles.dividerContainer}>
                                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                    <Text style={[styles.dividerText, { color: theme.icon }]}>OR</Text>
                                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                </View>

                                <View style={styles.oauthContainer}>
                                    <TouchableOpacity style={[styles.oauthButton, { borderColor: theme.border }]} onPress={() => showToast('Google Signup coming soon', 'info')}>
                                        <Text style={[styles.oauthText, { color: theme.text }]}>Google</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={[styles.oauthButton, { borderColor: theme.border }]} onPress={() => showToast('Apple Signup coming soon', 'info')}>
                                        <Text style={[styles.oauthText, { color: theme.text }]}>Apple</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </GlassCard>
                    </Animated.View>

                    <Animated.View
                        entering={FadeInUp.delay(700).duration(1000).springify()}
                        style={styles.footer}
                    >
                        <Text style={{ color: theme.icon }}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={{ color: theme.primary, fontWeight: '700' }}>Sign In</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 20,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 6,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: '500',
        opacity: 0.7,
        lineHeight: 22,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    roleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        elevation: 2,
    },
    roleText: {
        fontSize: 15,
        fontWeight: '700',
    },
    glassForm: {
        borderRadius: 24,
        marginBottom: 16,
    },
    form: {
        gap: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        gap: 4,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 10,
        fontSize: 12,
        fontWeight: '600',
    },
    oauthContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    oauthButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    oauthText: {
        fontSize: 14,
        fontWeight: '600',
    },
    offlineBanner: {
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
        paddingBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offlineText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
});
