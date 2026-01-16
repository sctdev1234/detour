import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Lock, LogIn, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { auth } from '../../services/firebaseConfig';

export default function LoginScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Success - useAuthStore will be updated by onAuthStateChanged in _layout
        } catch (error: any) {
            Alert.alert('Login failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
                <Text style={[styles.subtitle, { color: theme.icon }]}>Sign in to continue your journey</Text>
            </View>

            <View style={styles.form}>
                <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Mail size={20} color={theme.icon} />
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Email Address"
                        placeholderTextColor={theme.icon}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Lock size={20} color={theme.icon} />
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Password"
                        placeholderTextColor={theme.icon}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={{ color: theme.primary }}>Forgot Password?</Text>
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
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>Sign Up</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
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
        gap: 16,
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
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
});
