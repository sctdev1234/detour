import { useUIStore } from '@/store/useUIStore';
import { useRouter } from 'expo-router';
import { Car, CheckCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function SignupScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const register = useAuthStore((state) => state.register);
    const { showToast } = useUIStore();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [role, setRole] = useState<'client' | 'driver'>('client');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            showToast('Please fill in all fields', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        setLoading(true);
        try {
            await register(email, password, name, role);
            // Success - will redirect to role selection via _layout
        } catch (error: any) {
            showToast(error.message || 'Signup Failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Start Your Journey</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>Create your account today</Text>
                </View>

                <View style={styles.roleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.roleButton,
                            role === 'client' && { backgroundColor: theme.primary, borderColor: theme.primary },
                            { borderColor: theme.border, backgroundColor: theme.surface }
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
                            role === 'driver' && { backgroundColor: theme.primary, borderColor: theme.primary },
                            { borderColor: theme.border, backgroundColor: theme.surface }
                        ]}
                        onPress={() => setRole('driver')}
                    >
                        <Car size={24} color={role === 'driver' ? '#fff' : theme.icon} />
                        <Text style={[
                            styles.roleText,
                            { color: role === 'driver' ? '#fff' : theme.text }
                        ]}>Driver</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <User size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="John Doe"
                                placeholderTextColor={theme.icon}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

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
                                placeholder="Min 8 characters"
                                placeholderTextColor={theme.icon}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? (
                                    <EyeOff size={20} color={theme.icon} />
                                ) : (
                                    <Eye size={20} color={theme.icon} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <CheckCircle size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Re-enter password"
                                placeholderTextColor={theme.icon}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? (
                                    <EyeOff size={20} color={theme.icon} />
                                ) : (
                                    <Eye size={20} color={theme.icon} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.signupButton, { backgroundColor: theme.primary }]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.signupButtonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={{ color: theme.icon }}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={{ color: theme.primary, fontWeight: '700' }}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
        marginTop: 60,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.7,
        lineHeight: 24,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    roleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 2,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
    },
    roleText: {
        fontSize: 16,
        fontWeight: '700',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 10,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 4,
        textTransform: 'uppercase',
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 20,
        gap: 14,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        height: '100%',
    },
    signupButton: {
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        elevation: 6,
        boxShadow: '0px 8px 20px rgba(0,0,0,0.2)',
    },
    signupButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 20,
        gap: 4,
    },
});

