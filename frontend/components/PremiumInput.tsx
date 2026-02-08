import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface PremiumInputProps extends TextInputProps {
    icon?: LucideIcon;
    label?: string;
    error?: string;
    touched?: boolean;
}

export function PremiumInput({
    icon: Icon,
    label,
    error,
    touched,
    secureTextEntry,
    value,
    onBlur,
    onFocus,
    style,
    ...props
}: PremiumInputProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Animation values
    const focusProgress = useSharedValue(0);

    useEffect(() => {
        focusProgress.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    }, [isFocused]);

    const animatedBorderIdx = useAnimatedStyle(() => {
        const borderColor = interpolateColor(
            focusProgress.value,
            [0, 1],
            ['rgba(0,0,0,0.05)', theme.primary]
        );
        return {
            borderColor: error && touched ? '#ef4444' : borderColor,
            borderWidth: isFocused || (error && touched) ? 1.5 : 1,
        };
    });

    const handleFocus = (e: any) => {
        setIsFocused(true);
        onFocus && onFocus(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        onBlur && onBlur(e);
    };

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={[styles.label, { color: theme.text }]}>{label}</Text>}

            <Animated.View style={[styles.inputWrapper, animatedBorderIdx]}>
                <BlurView intensity={20} tint="light" style={styles.blurContainer}>
                    {Icon && (
                        <View style={styles.iconContainer}>
                            <Icon size={20} color={isFocused ? theme.primary : theme.icon} />
                        </View>
                    )}

                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholderTextColor={theme.icon}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        secureTextEntry={secureTextEntry && !isPasswordVisible}
                        value={value}
                        {...props}
                    />

                    {secureTextEntry && (
                        <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                            {isPasswordVisible ? (
                                <EyeOff size={20} color={theme.icon} />
                            ) : (
                                <Eye size={20} color={theme.icon} />
                            )}
                        </TouchableOpacity>
                    )}
                </BlurView>
            </Animated.View>

            {error && touched && (
                <Animated.Text entering={undefined} style={styles.errorText}>
                    {error}
                </Animated.Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        opacity: 0.8,
    },
    inputWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    blurContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 56,
    },
    iconContainer: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
        fontWeight: '500',
    },
    eyeIcon: {
        padding: 4,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '500',
    },
});
