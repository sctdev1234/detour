import { useUIStore } from '@/store/useUIStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Car, CheckCircle, Lock, Mail, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { PremiumButton } from '../../components/PremiumButton';
import { PremiumInput } from '../../components/PremiumInput';
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
    const [confirmPassword, setConfirmPassword] = useState('');
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
        <LinearGradient
            colors={[theme.background, theme.surface]}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
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
                        />
                    </View>

                    <View style={styles.footer}>
                        <Text style={{ color: theme.icon }}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={{ color: theme.primary, fontWeight: '700' }}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
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
        gap: 8,
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

