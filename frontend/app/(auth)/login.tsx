import { useUIStore } from '@/store/useUIStore';
import { useRouter } from 'expo-router';
import { Lock, LogIn, Mail, ShieldCheck, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
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
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.background }]}
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
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Mail size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="name@email.com"
                                placeholderTextColor={theme.icon}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Lock size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={theme.icon}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

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

                <View style={styles.footer}>
                    <Text style={{ color: theme.icon }}>Temporary Development Users</Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                            onPress={() => {
                                setEmail('client@gmail.com')
                                setPassword('12345678')
                            }}
                        >
                            <Text style={{ color: theme.primary, fontWeight: '700' }}>Client</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                            onPress={() => {
                                setEmail('driver@gmail.com')
                                setPassword('12345678')
                            }}
                        >
                            <Text style={{ color: theme.primary, fontWeight: '700' }}>Driver</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
    },
    logo: {
        width: 48,
        height: 48,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
    },
    loginButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    quickLoginContainer: {
        marginTop: 40,
        borderTopWidth: 1,
        paddingTop: 24,
        alignItems: 'center',
        gap: 16,
    },
    quickLoginTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    quickLoginRow: {
        flexDirection: 'row',
        gap: 12,
    },
    quickLoginChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    quickLoginText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
