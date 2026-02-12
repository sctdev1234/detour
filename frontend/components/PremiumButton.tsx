import { Colors } from '@/constants/theme';
import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, TouchableOpacityProps, useColorScheme, ViewStyle } from 'react-native';

interface PremiumButtonProps extends TouchableOpacityProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    icon?: LucideIcon;
    loading?: boolean;
    textStyle?: TextStyle;
    style?: ViewStyle;
}

export function PremiumButton({
    title,
    onPress,
    variant = 'primary',
    icon: Icon,
    loading = false,
    textStyle,
    style,
    disabled,
    ...props
}: PremiumButtonProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const getBackgroundColor = () => {
        if (disabled) return theme.surfaceHighlight;
        switch (variant) {
            case 'primary': return theme.primary;
            case 'secondary': return theme.secondary;
            case 'danger': return theme.error;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return theme.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme.icon;
        switch (variant) {
            case 'primary': return '#FFFFFF';
            case 'secondary': return '#FFFFFF';
            case 'danger': return '#FFFFFF';
            case 'outline': return theme.primary;
            case 'ghost': return theme.text;
            default: return '#FFFFFF';
        }
    };

    const getBorderColor = () => {
        if (variant === 'outline') return theme.primary;
        return 'transparent';
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.button,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' ? 1.5 : 0,
                    elevation: variant === 'primary' ? 4 : 0,
                    shadowColor: variant === 'primary' ? theme.primary : 'transparent',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: variant === 'primary' ? 0.3 : 0,
                    shadowRadius: 8,
                },
                style
            ]}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {Icon && <Icon size={20} color={getTextColor()} style={{ marginRight: 8 }} />}
                    <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    text: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
