import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    onGoOnline: () => void;
}

export default function OfflineView({ onGoOnline }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={styles.iconContainer}>
                <WifiOff size={48} color={theme.textSecondary} />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>You're Offline</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Go online to start receiving trip requests.
            </Text>

            <TouchableOpacity
                style={[styles.goOnlineButton, { backgroundColor: '#10b981' }]}
                onPress={onGoOnline}
                activeOpacity={0.8}
            >
                <Text style={styles.buttonText}>GO ONLINE</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        marginHorizontal: 16,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 20,
    },
    goOnlineButton: {
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 14,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    }
});
