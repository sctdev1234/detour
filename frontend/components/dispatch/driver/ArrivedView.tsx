import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Clock, Phone, MessageSquare } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    trip: any;
    onStartTrip: () => void;
}

export default function ArrivedView({ trip, onStartTrip }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={styles.headerRow}>
                <View style={[styles.waitingBadge]}>
                    <Clock size={18} color="#f59e0b" />
                    <Text style={styles.waitingText}>Waiting for Passenger</Text>
                </View>
            </View>

            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                You've arrived at the pickup point. Waiting for the passenger to board.
            </Text>

            <View style={styles.contactRow}>
                <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                    activeOpacity={0.7}
                >
                    <Phone size={20} color="#3b82f6" />
                    <Text style={[styles.contactText, { color: '#3b82f6' }]}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}
                    activeOpacity={0.7}
                >
                    <MessageSquare size={20} color="#8b5cf6" />
                    <Text style={[styles.contactText, { color: '#8b5cf6' }]}>Message</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.startButton, { backgroundColor: '#10b981' }]}
                onPress={onStartTrip}
                activeOpacity={0.8}
            >
                <Text style={styles.startText}>PASSENGER BOARDED — START TRIP</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderRadius: 20,
        marginHorizontal: 16,
    },
    headerRow: {
        alignItems: 'center',
        marginBottom: 12,
    },
    waitingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    waitingText: {
        color: '#f59e0b',
        fontWeight: '800',
        fontSize: 15,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    contactRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    contactText: {
        fontWeight: '700',
        fontSize: 14,
    },
    startButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    startText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 0.5,
    }
});
