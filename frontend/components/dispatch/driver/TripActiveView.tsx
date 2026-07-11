import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Navigation, MapPin } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    trip: any;
    onComplete: () => void;
}

export default function TripActiveView({ trip, onComplete }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const destAddress = trip?.tripInstanceId?.destination?.address || trip?.destination?.address || 'Destination';

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
                    <View style={[styles.liveBadge]}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>TRIP IN PROGRESS</Text>
                    </View>
                </View>

                <View style={styles.destinationCard}>
                    <View style={styles.destIconContainer}>
                        <MapPin size={20} color="#ef4444" />
                    </View>
                    <View style={styles.destInfo}>
                        <Text style={[styles.destLabel, { color: theme.textSecondary }]}>Heading to</Text>
                        <Text style={[styles.destAddress, { color: theme.text }]} numberOfLines={2}>
                            {destAddress}
                        </Text>
                    </View>
                </View>

                <View style={styles.navRow}>
                    <TouchableOpacity
                        style={[styles.navButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                        activeOpacity={0.7}
                    >
                        <Navigation size={18} color="#3b82f6" />
                        <Text style={[styles.navText, { color: '#3b82f6' }]}>Navigate</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.completeButton, { backgroundColor: '#3b82f6' }]}
                    onPress={onComplete}
                    activeOpacity={0.8}
                >
                    <Text style={styles.completeText}>COMPLETE TRIP</Text>
                </TouchableOpacity>
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
        alignItems: 'center',
        marginBottom: 20,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    liveDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10b981',
    },
    liveText: {
        color: '#10b981',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1.5,
    },
    destinationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        marginBottom: 20,
    },
    destIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    destInfo: {
        flex: 1,
    },
    destLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    destAddress: {
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 22,
    },
    navRow: {
        marginBottom: 20,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    navText: {
        fontWeight: '800',
        fontSize: 15,
    },
    completeButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    completeText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    }
});
