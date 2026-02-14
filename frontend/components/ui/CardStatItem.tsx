import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

export default function CardStatItem({ label, value, icon: Icon, onPress, color }: any) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const Content = (
        <View style={styles.statItem}>
            <View style={styles.statValueBox}>
                <View style={[styles.statIconBox, { backgroundColor: (color || theme.primary) + '15' }]}>
                    {Icon && <Icon size={20} color={color || theme.primary} strokeWidth={2.5} />}
                </View>
                <Text style={[styles.statValue, { color: (color || theme.text) }]}>{value}</Text>
            </View>
            <View>
                <Text style={[styles.statLabel, { color: theme.icon }]}>{label}</Text>
            </View>
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} style={{ flex: 1 }}>
                {Content}
            </TouchableOpacity>
        );
    }

    return <View style={{ flex: 1 }}>{Content}</View>;
}

const styles = StyleSheet.create({
    statItem: {
        gap: 12,
        flex: 1,
    },
    statValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statIconBox: {
        width: 48,
        height: 48,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
});