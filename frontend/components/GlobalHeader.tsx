import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

export default function GlobalHeader() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user, role } = useAuthStore();

    // Determine profile route based on role
    const profileRoute = role === 'driver' ? '/(driver)/profile' : '/(client)/profile';

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerStyle = Platform.OS === 'ios'
        ? [styles.container, { paddingTop: insets.top, backgroundColor: 'transparent' }]
        : [styles.container, { paddingTop: insets.top, backgroundColor: theme.surface, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }];

    return (
        <Container intensity={80} tint={colorScheme} style={containerStyle}>
            <View style={styles.content}>
                {/* Brand / Logo */}
                <View style={styles.brandContainer}>
                    <Text style={[styles.brandText, { color: theme.primary }]}>Detour</Text>
                    <Text style={[styles.brandDot, { color: theme.secondary }]}>.</Text>
                    {user && role && (
                        <View style={[styles.roleBadge, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.roleText, { color: theme.icon }]}>
                                {role === 'driver' ? 'Driver' : 'Client'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Right Side: User Profile or Login */}
                {user ? (
                    <TouchableOpacity
                        style={[styles.profileButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => router.push(profileRoute as any)}
                    >
                        {/* Placeholder for user image if available, else Icon */}
                        <User size={20} color={theme.text} />
                    </TouchableOpacity>
                ) : (
                    // Optional: Show Login button if not logged in, or nothing
                    null
                )}
            </View>
        </Container>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    content: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    brandText: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -1.5,
    },
    brandDot: {
        fontSize: 26,
        fontWeight: '900',
    },
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    roleText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});

