import { X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useUIStore } from '../store/useUIStore';

export default function Toast() {
    const { toastMessage, toastType, isToastVisible, hideToast } = useUIStore();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const translateY = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (isToastVisible) {
            // Slide In
            Animated.spring(translateY, {
                toValue: 0,
                damping: 15,
                useNativeDriver: true,
            }).start();

            // Auto Hide after 3 seconds
            const timer = setTimeout(() => {
                hideToast();
            }, 4000);

            return () => clearTimeout(timer);
        } else {
            // Slide Out
            Animated.timing(translateY, {
                toValue: -150,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isToastVisible, hideToast]);

    const getBackgroundColor = () => {
        switch (toastType) {
            case 'success': return '#10B981'; // Green
            case 'error': return '#EF4444'; // Red
            case 'warning': return '#F59E0B'; // Yellow
            case 'info': default: return '#3B82F6'; // Blue
        }
    };

    if (!isToastVisible) return null; // Or keep it mounted but off-screen if prefer animation smoothness always

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: insets.top + 10,
                    transform: [{ translateY }]
                }
            ]}
        >
            <View style={[styles.content, { backgroundColor: getBackgroundColor() }]}>
                <Text style={styles.message}>{toastMessage}</Text>
                <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
                    <X size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 9999,
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        width: '100%',
    },
    message: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    closeButton: {
        marginLeft: 12,
        padding: 4,
    }
});
