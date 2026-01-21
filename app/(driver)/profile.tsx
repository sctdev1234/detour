import { signOut } from 'firebase/auth';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { auth } from '../../services/firebaseConfig';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProfileScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { logout, setRole } = useAuthStore();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            logout();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>User settings and logout</Text>

            <VerificationStatus theme={theme} />

            <TouchableOpacity
                style={[styles.roleButton, { borderColor: theme.primary, borderWidth: 1 }]}
                onPress={() => setRole(null)}
            >
                <Text style={[styles.roleButtonText, { color: theme.primary }]}>Switch Role</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: theme.accent }]}
                onPress={handleSignOut}
            >
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 48,
    },
    logoutButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    logoutText: {
        color: '#fff',
        fontWeight: '600',
    },
    roleButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginBottom: 16,
        width: '100%',
        alignItems: 'center',
    },
    roleButtonText: {
        fontWeight: '600',
    }
});
