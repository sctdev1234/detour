import { useUIStore } from '@/store/useUIStore';
import { useRouter } from 'expo-router';
import { Lock, LogIn, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
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
                    <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>Sign in to your account</Text>
                </View>

                <View style={styles.form}>
                    <View style={[styles.inputGroup]}>
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

                    <View style={[styles.inputGroup]}>
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

                <View style={styles.footer}>
                    <Text style={{ color: theme.icon }}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                        <Text style={{ color: theme.primary, fontWeight: '700' }}>Create Account</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={{ color: theme.icon }}>Temporary Development Users</Text>
                    <div className="flex flex-row gap-4">
                        <button
                            className="flex flex-row items-center gap-2"
                            onClick={() => {
                                setEmail('client@gmail.com')
                                setPassword('12345678')
                            }}
                        >
                            <Text style={{ color: theme.primary, fontWeight: '700' }}>Client</Text>
                        </button>
                        <button
                            className="flex flex-row items-center gap-2"
                            onClick={() => {
                                setEmail('driver@gmail.com')
                                setPassword('12345678')
                            }}
                        >
                            <Text style={{ color: theme.primary, fontWeight: '700' }}>Driver</Text>
                        </button>
                    </div>
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
    },
    title: {
        fontSize: 32,
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
        boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
        elevation: 6,
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
});
