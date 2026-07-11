import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
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

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios'
        ? { intensity: 90, tint: colorScheme }
        : {};
    
    const bgColor = colorScheme === 'dark'
        ? 'rgba(28, 28, 30, 0.95)'
        : 'rgba(255, 255, 255, 0.95)';

    return (
        <View style={styles.wrapper}>
            <Container
                {...containerProps}
                style={[styles.container, Platform.OS !== 'ios' && { backgroundColor: bgColor }]}
            >
                <View style={styles.headerRow}>
                    <View style={styles.navIndicator}>
                        <Navigation size={18} color="#fff" fill="#fff" />
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>Navigating to Pickup</Text>
                </View>

                <View style={styles.addressCard}>
                    <View style={styles.addressIconContainer}>
                        <MapPin size={20} color="#10b981" />
                    </View>
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
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.arrivedButton, { backgroundColor: '#f59e0b' }]}
                        onPress={onArrived}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.arrivedText}>I'VE ARRIVED</Text>
                    </TouchableOpacity>
                </View>
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        paddingBottom: 20,
    },
    container: {
        padding: 24,
        borderRadius: 24,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    navIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        marginBottom: 24,
    },
    addressIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addressText: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        lineHeight: 22,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    callButton: {
        width: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
    },
    arrivedButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
    },
    arrivedText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    }
});
