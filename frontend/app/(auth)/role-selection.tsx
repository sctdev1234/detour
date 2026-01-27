import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { useAuthStore, Role } from '../../store/useAuthStore';
import { Colors } from '../../constants/theme';
import { Car, User, ArrowRight } from 'lucide-react-native';

export default function RoleSelection() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const setRole = useAuthStore((state) => state.setRole);

    const handleSelectRole = (role: Role) => {
        setRole(role);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.title, { color: theme.text }]}>Welcome to Detour</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>Choose your role to get started</Text>

            <View style={styles.rolesContainer}>
                <TouchableOpacity
                    style={[styles.roleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => handleSelectRole('driver')}
                >
                    <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
                        <Car size={32} color="#fff" />
                    </View>
                    <View style={styles.roleInfo}>
                        <Text style={[styles.roleTitle, { color: theme.text }]}>Driver</Text>
                        <Text style={[styles.roleDescription, { color: theme.icon }]}>Offer rides and earn profit</Text>
                    </View>
                    <ArrowRight size={24} color={theme.border} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.roleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => handleSelectRole('client')}
                >
                    <View style={[styles.iconContainer, { backgroundColor: theme.secondary }]}>
                        <User size={32} color="#fff" />
                    </View>
                    <View style={styles.roleInfo}>
                        <Text style={[styles.roleTitle, { color: theme.text }]}>Client</Text>
                        <Text style={[styles.roleDescription, { color: theme.icon }]}>Find rides for your trips</Text>
                    </View>
                    <ArrowRight size={24} color={theme.border} />
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
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 48,
    },
    rolesContainer: {
        gap: 16,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    roleInfo: {
        flex: 1,
    },
    roleTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    roleDescription: {
        fontSize: 14,
    },
});
