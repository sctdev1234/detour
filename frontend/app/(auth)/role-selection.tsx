import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Car, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { Role } from '../../types';

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
                <Animated.View entering={FadeInDown.delay(200).duration(1000).springify()}>
                    <Text style={[styles.title, { color: theme.text }]}>Welcome to Detour</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>Choose your role to get started</Text>
                </Animated.View>

                <View style={styles.rolesContainer}>
                    <Animated.View entering={FadeInUp.delay(400).duration(1000).springify()}>
                        <TouchableOpacity
                            onPress={() => handleSelectRole('driver')}
                            activeOpacity={0.9}
                        >
                            <GlassCard intensity={60} style={styles.roleCardGlass}>
                                <View style={styles.roleContent}>
                                    <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
                                        <Car size={32} color="#fff" />
                                    </View>
                                    <View style={styles.roleInfo}>
                                        <Text style={[styles.roleTitle, { color: theme.text }]}>Driver</Text>
                                        <Text style={[styles.roleDescription, { color: theme.icon }]}>Offer rides and earn profit</Text>
                                    </View>
                                    <ArrowRight size={24} color={theme.border} />
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(600).duration(1000).springify()}>
                        <TouchableOpacity
                            onPress={() => handleSelectRole('client')}
                            activeOpacity={0.9}
                        >
                            <GlassCard intensity={60} style={styles.roleCardGlass}>
                                <View style={styles.roleContent}>
                                    <View style={[styles.iconContainer, { backgroundColor: theme.secondary }]}>
                                        <User size={32} color="#fff" />
                                    </View>
                                    <View style={styles.roleInfo}>
                                        <Text style={[styles.roleTitle, { color: theme.text }]}>Passenger</Text>
                                        <Text style={[styles.roleDescription, { color: theme.icon }]}>Find rides for your trips</Text>
                                    </View>
                                    <ArrowRight size={24} color={theme.border} />
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    </Animated.View>
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
    roleCardGlass: {
        borderRadius: 28,
        overflow: 'hidden',
    },
    roleContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        elevation: 4,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.2)',
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

