import { useUIStore } from '@/store/useUIStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Lock, LogIn, Mail, ShieldCheck, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const login = useAuthStore((state) => state.login);

    const { showToast } = useUIStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            showToast('Please fill in all fields', 'warning');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            // Router automatic redirection in _layout will handle the rest
        } catch (error: any) {
            showToast(error.message || 'Login Failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={[theme.background, theme.surface]}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.header}>
                        <View style={[styles.logoContainer, { backgroundColor: theme.surface }]}>
                            <Image
                                source={require('../../assets/images/logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
                        <Text style={[styles.subtitle, { color: theme.icon }]}>Sign in to continue to Detour</Text>
                    </View>

                    <View style={styles.form}>
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
                            placeholder="••••••••"
                            icon={Lock}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => router.push('/(auth)/forgot-password')}
                        >
                            <Text style={{ color: theme.primary, fontWeight: '600' }}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.loginButton, { backgroundColor: theme.primary }]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <LogIn size={20} color="#fff" />
                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.quickLoginContainer, { borderTopColor: theme.border }]}>
                        <Text style={[styles.quickLoginTitle, { color: theme.icon }]}>Quick Login (Dev)</Text>
                        <View style={styles.quickLoginRow}>
                            <TouchableOpacity
                                style={[styles.quickLoginChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                onPress={() => {
                                    setEmail('client@gmail.com');
                                    setPassword('12345678');
                                }}
                            >
                                <User size={16} color={theme.primary} />
                                <Text style={[styles.quickLoginText, { color: theme.primary }]}>Client</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickLoginChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                onPress={() => {
                                    setEmail('driver@gmail.com');
                                    setPassword('12345678');
                                }}
                            >
                                <ShieldCheck size={16} color={theme.secondary} />
                                <Text style={[styles.quickLoginText, { color: theme.secondary }]}>Driver</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={{ color: theme.icon }}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                            <Text style={{ color: theme.primary, fontWeight: '700' }}>Create Account</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        elevation: 6,
        boxShadow: '0px 8px 24px rgba(0,0,0,0.12)',
    },
    logo: {
        width: 60,
        height: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.7,
    },
    form: {
        gap: 8,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        paddingVertical: 4,
        marginBottom: 24,
    },
    loginButton: {
        height: 60,
        borderRadius: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        elevation: 6,
        boxShadow: '0px 8px 20px rgba(0,0,0,0.2)',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
        gap: 4,
    },
    quickLoginContainer: {
        marginTop: 48,
        borderTopWidth: 1,
        paddingTop: 24,
        alignItems: 'center',
        gap: 20,
        opacity: 0.9,
    },
    quickLoginTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.5,
    },
    quickLoginRow: {
        flexDirection: 'row',
        gap: 16,
    },
    quickLoginChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
    },
    quickLoginText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
