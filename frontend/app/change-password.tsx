import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { changePassword } = useAuthStore();
    const { showToast } = useUIStore();

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Visibility states
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        setIsLoading(true);
        try {
            await changePassword(oldPassword, newPassword);
            showToast('Password updated successfully', 'success');
            router.back();
        } catch (error: any) {
            showToast(error.message || 'Failed to update password', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const PasswordInput = ({
        label,
        value,
        onChangeText,
        secureTextEntry,
        onToggleVisibility,
        isVisible
    }: {
        label: string;
        value: string;
        onChangeText: (text: string) => void;
        secureTextEntry: boolean;
        onToggleVisibility: () => void;
        isVisible: boolean;
    }) => (
        <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Lock size={20} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor={theme.icon}
                    secureTextEntry={secureTextEntry}
                    value={value}
                    onChangeText={onChangeText}
                />
                <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeIcon}>
                    {isVisible ? (
                        <EyeOff size={20} color={theme.icon} />
                    ) : (
                        <Eye size={20} color={theme.icon} />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.backText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Security</Text>
                <View style={{ width: 70 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.title, { color: theme.text }]}>Change Password</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>
                        Create a strong password to keep your account secure.
                    </Text>
                </View>

                <View style={styles.form}>
                    <PasswordInput
                        label="Current Password"
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        secureTextEntry={!showOld}
                        onToggleVisibility={() => setShowOld(!showOld)}
                        isVisible={showOld}
                    />

                    <PasswordInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNew}
                        onToggleVisibility={() => setShowNew(!showNew)}
                        isVisible={showNew}
                    />

                    <PasswordInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirm}
                        onToggleVisibility={() => setShowConfirm(!showConfirm)}
                        isVisible={showConfirm}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isLoading}
                        style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 }]}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Update Password</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        fontSize: 14,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    headerTextContainer: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        opacity: 0.7,
    },
    form: {
        gap: 20,
    },
    inputWrapper: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 4,
        textTransform: 'uppercase',
        opacity: 0.8,
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
    inputIcon: {
        opacity: 0.5,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        height: '100%',
    },
    eyeIcon: {
        padding: 8,
        opacity: 0.7,
    },
    submitButton: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.15)',
        elevation: 6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
