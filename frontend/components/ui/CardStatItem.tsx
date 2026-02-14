import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';
import { GlassCard } from '../GlassCard';

export default function CardStatItem({ label, value, icon: Icon, onPress, color }: any) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const Content = (
        <GlassCard style={styles.metricCard} intensity={20} contentContainerStyle={{ padding: 16 }}>
            <View style={styles.statItem}>
                <View style={styles.statValueBox}>
                    <View style={[styles.statIconBox, { backgroundColor: (color || theme.primary) + '15' }]}>
                        {Icon && <Icon size={20} color={color || theme.primary} strokeWidth={2.5} />}
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: (color || theme.text) }]}>{value}</Text>
                        <Text style={[styles.statLabel, { color: theme.icon }]}>{label}</Text>
                    </View>
                </View>
            </View>
        </GlassCard>
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
    metricCard: {
        borderRadius: 24,
        borderWidth: 0,
        overflow: 'hidden',
    },
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
        textAlign: 'right',
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'right',
    },
});