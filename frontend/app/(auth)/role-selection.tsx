import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Car, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { Role, useAuthStore } from '../../store/useAuthStore';

export default function RoleSelection() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const setRole = useAuthStore((state) => state.setRole);

    const handleSelectRole = (role: Role) => {
        setRole(role);
    };

    return (
        <LinearGradient
            colors={[theme.background, theme.surface]}
            style={styles.container}
        >
            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.text }]}>Welcome to Detour</Text>
                <Text style={[styles.subtitle, { color: theme.icon }]}>Choose your role to get started</Text>

                <View style={styles.rolesContainer}>
                    <TouchableOpacity
                        style={[styles.roleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => handleSelectRole('driver')}
                        activeOpacity={0.9}
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
                        activeOpacity={0.9}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: theme.secondary }]}>
                            <User size={32} color="#fff" />
                        </View>
                        <View style={styles.roleInfo}>
                            <Text style={[styles.roleTitle, { color: theme.text }]}>Passenger</Text>
                            <Text style={[styles.roleDescription, { color: theme.icon }]}>Find rides for your trips</Text>
                        </View>
                        <ArrowRight size={24} color={theme.border} />
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '500',
        opacity: 0.7,
        marginBottom: 48,
        lineHeight: 26,
    },
    rolesContainer: {
        gap: 20,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        borderRadius: 28,
        borderWidth: 1,
        elevation: 4,
        boxShadow: '0px 4px 16px rgba(0,0,0,0.06)',
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        elevation: 2,
        boxShadow: '0px 4px 10px rgba(0,0,0,0.15)',
    },
    roleInfo: {
        flex: 1,
        gap: 4,
    },
    roleTitle: {
        fontSize: 22,
        fontWeight: '800',
    },
    roleDescription: {
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.7,
        lineHeight: 20,
    },
});

