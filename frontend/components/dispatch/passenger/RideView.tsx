import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Shield, Music, MapPin, Navigation, Share, AlertTriangle } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function RideView() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const highlightBg = isDark ? '#1C1C1E' : '#F2F2F7';

    return (
        <Animated.View entering={FadeInUp.springify()} style={styles.container}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.card, { backgroundColor: cardBg }]}>
                
                {/* Trip Progress Header */}
                <View style={styles.header}>
                    <View style={styles.etaContainer}>
                        <Text style={[styles.etaValue, { color: textColor }]}>12</Text>
                        <Text style={[styles.etaUnit, { color: subtextColor }]}>min</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={[styles.dropoffLabel, { color: subtextColor }]}>Drop-off at</Text>
                        <Text style={[styles.dropoffTime, { color: textColor }]}>14:45</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={[styles.progressTrack, { backgroundColor: highlightBg }]}>
                    <View style={[styles.progressFill, { backgroundColor: theme.primary, width: '40%' }]} />
                </View>

                <View style={styles.divider} />

                {/* Current Action / Safety */}
                <View style={styles.safetyRow}>
                    <View style={styles.safetyIconContainer}>
                        <Shield size={24} color={theme.primary} />
                    </View>
                    <View style={styles.safetyTextContainer}>
                        <Text style={[styles.safetyTitle, { color: textColor }]}>On your way to destination</Text>
                        <Text style={[styles.safetySubtitle, { color: subtextColor }]}>Location sharing is off</Text>
                    </View>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: highlightBg }]}>
                        <Share size={18} color={textColor} />
                    </TouchableOpacity>
                </View>

                <View style={styles.toolsGrid}>
                    <TouchableOpacity style={[styles.toolCard, { backgroundColor: highlightBg }]}>
                        <Music size={20} color={textColor} style={{ marginBottom: 8 }} />
                        <Text style={[styles.toolText, { color: textColor }]}>Music</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.toolCard, { backgroundColor: highlightBg }]}>
                        <Navigation size={20} color={textColor} style={{ marginBottom: 8 }} />
                        <Text style={[styles.toolText, { color: textColor }]}>Edit Route</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.toolCard, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                        <AlertTriangle size={20} color="#FF3B30" style={{ marginBottom: 8 }} />
                        <Text style={[styles.toolText, { color: '#FF3B30' }]}>Emergency</Text>
                    </TouchableOpacity>
                </View>

            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 20,
    },
    card: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    etaContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    etaValue: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
        marginRight: 4,
    },
    etaUnit: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    dropoffLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 2,
    },
    dropoffTime: {
        fontSize: 18,
        fontWeight: '700',
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        width: '100%',
        marginBottom: 24,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(150, 150, 150, 0.15)',
        marginBottom: 20,
    },
    safetyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    safetyIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(10, 132, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    safetyTextContainer: {
        flex: 1,
    },
    safetyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    safetySubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    toolsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    toolCard: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    toolText: {
        fontSize: 13,
        fontWeight: '600',
    }
});
