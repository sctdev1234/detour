import { useUIStore } from '@/store/useUIStore';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const forgotPassword = useAuthStore((state) => state.forgotPassword);
    const { showToast, showConfirm } = useUIStore();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!email) {
            showToast('Please enter your email address', 'warning');
            return;
        }

        setLoading(true);
        try {
            const token = await forgotPassword(email);
            // In a real app, you would tell the user to check their email.
            // For this dev setup, we simulate the next step.
            showConfirm(
                'Check your Email',
                `We have sent a reset link to ${email}. \n\n(Dev Token: ${token.substring(0, 8)}...)`,
                () => router.push({ pathname: '/(auth)/reset-password', params: { token } }),
                () => { },
                'Enter Reset Code'
            );
        } catch (error: any) {
            showToast(error.message || 'Error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>Enter your email to receive recovery instructions.</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
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

                    <TouchableOpacity
                        style={[styles.resetButton, { backgroundColor: theme.primary }]}
                        onPress={handleReset}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Send size={20} color="#fff" />
                                <Text style={styles.resetButtonText}>Send Link</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
    },
    backButton: {
        marginTop: 40,
        marginBottom: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingBottom: 100, // Visual balance
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
        lineHeight: 24,
    },
    form: {
        gap: 24,
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
    resetButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    resetButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
