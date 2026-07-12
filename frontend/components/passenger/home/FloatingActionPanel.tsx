import { LocateFixed, Plus } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Colors } from '../../../constants/theme';

interface FloatingActionPanelProps {
    bottomOffset: number;
    onLocatePress: () => void;
    onAddPress?: () => void;
    showAdd?: boolean;
}

export default function FloatingActionPanel({ bottomOffset, onLocatePress, onAddPress, showAdd }: FloatingActionPanelProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    return (
        <Animated.View 
            entering={FadeInDown.duration(400).springify().damping(15)}
            exiting={FadeOutDown.duration(400)}
            style={[styles.container, { bottom: bottomOffset + 24 }]}
        >
            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: isDark ? '#2c2c2e' : '#ffffff' }, styles.shadow]} 
                onPress={onLocatePress}
            >
                <LocateFixed size={22} color={theme.text} />
            </TouchableOpacity>

            {showAdd && (
                <TouchableOpacity 
                    style={[styles.fab, styles.primaryFab, { backgroundColor: theme.primary }, styles.shadow]} 
                    onPress={onAddPress}
                >
                    <Plus size={24} color="#ffffff" />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 16,
        alignItems: 'flex-end',
        gap: 16,
        zIndex: 50,
    },
    fab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryFab: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
});
