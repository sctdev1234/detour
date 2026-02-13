import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleProp, StyleSheet, useColorScheme, View, ViewProps, ViewStyle } from 'react-native';

interface GlassCardProps extends ViewProps {
    intensity?: number;
    variant?: 'default' | 'highlight';
    contentContainerStyle?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style, intensity = 20, variant = 'default', contentContainerStyle, ...props }: GlassCardProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const isDark = colorScheme === 'dark';

    return (
        <View style={[styles.container, style]}>
            <BlurView
                intensity={isDark ? intensity + 20 : intensity}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />
            <View style={[
                styles.content,
                {
                    backgroundColor: isDark
                        ? (variant === 'highlight' ? 'rgba(255,255,255,0.08)' : 'rgba(30,30,30,0.4)')
                        : (variant === 'highlight' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)'),
                    borderColor: theme.border,
                },
                contentContainerStyle
            ]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    content: {
        padding: 20,
        height: '100%',
        width: '100%',
    },
});
