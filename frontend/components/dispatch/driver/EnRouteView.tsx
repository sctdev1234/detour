import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Navigation, MapPin, Phone } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    trip: any;
    onArrived: () => void;
}

export default function EnRouteView({ trip, onArrived }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const pickupAddress = trip?.tripInstanceId?.pickup?.address || trip?.pickup?.address || 'Pickup location';

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={styles.headerRow}>
                <Navigation size={24} color="#3b82f6" />
                <Text style={[styles.title, { color: theme.text }]}>Navigating to Pickup</Text>
            </View>

            <View style={styles.addressCard}>
                <MapPin size={18} color="#10b981" />
                <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={2}>
                    {pickupAddress}
                </Text>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.callButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                    activeOpacity={0.7}
                >
                    <Phone size={20} color="#3b82f6" />
                    <Text style={[styles.callText, { color: '#3b82f6' }]}>Call Passenger</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.arrivedButton, { backgroundColor: '#f59e0b' }]}
                    onPress={onArrived}
                    activeOpacity={0.8}
                >
                    <Text style={styles.arrivedText}>I'VE ARRIVED</Text>
                </TouchableOpacity>
            </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
        marginBottom: 20,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    callButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    callText: {
        fontWeight: '700',
        fontSize: 14,
    },
    arrivedButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    arrivedText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 0.5,
    }
});
