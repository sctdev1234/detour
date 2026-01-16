import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { CheckCircle, Lock, Mail, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { auth } from '../../services/firebaseConfig';

export default function SignupScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            // Success - will redirect to role selection via _layout
        } catch (error: any) {
            Alert.alert('Signup failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
                <Text style={[styles.subtitle, { color: theme.icon }]}>Join Detour and start traveling together</Text>
            </View>

            <View style={styles.form}>
                <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <User size={20} color={theme.icon} />
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Full Name"
                        placeholderTextColor={theme.icon}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

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

                <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <CheckCircle size={20} color={theme.icon} />
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Confirm Password"
                        placeholderTextColor={theme.icon}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
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
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
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
    signupButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    signupButtonText: {
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
