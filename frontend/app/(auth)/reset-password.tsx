import { useUIStore } from '@/store/useUIStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Key, Lock } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const resetPassword = useAuthStore((state) => state.resetPassword);
    const { showToast, showConfirm } = useUIStore();

    // Auto-fill token if passed via params
    const [token, setToken] = useState(params.token ? params.token.toString() : '');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!token || !newPassword) {
            showToast('Please enter the code and your new password', 'warning');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, newPassword);
            showConfirm(
                'Success',
                'Your password has been reset. Please log in.',
                () => router.dismissAll(),
                undefined,
                'Log In',
                'OK'
            );
        } catch (error: any) {
            showToast(error.message || 'Reset Failed', 'error');
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
                    <Text style={[styles.title, { color: theme.text }]}>New Password</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>Create a strong password for your account.</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Reset Code</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Key size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Paste code here"
                                placeholderTextColor={theme.icon}
                                value={token}
                                onChangeText={setToken}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>New Password</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Lock size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Min 8 characters"
                                placeholderTextColor={theme.icon}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.updateButton, { backgroundColor: theme.primary }]}
                        onPress={handleUpdate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <CheckCircle size={20} color="#fff" />
                                <Text style={styles.updateButtonText}>Update Password</Text>
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
    updateButton: {
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
    updateButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
