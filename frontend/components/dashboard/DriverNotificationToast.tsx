import { BlurView } from 'expo-blur';
import { Users, ChevronRight, X, CheckCircle2 } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

export interface DriverNotificationData {
    id: string;
    routeId: string;
    type: 'new_match' | 'offer_accepted';
    clientName?: string;
    pickup?: string;
    fare?: number;
    destination?: string;
}

interface DriverNotificationToastProps {
    notification: DriverNotificationData | null;
    onView: (routeId: string) => void;
    onDismiss: () => void;
}

export const DriverNotificationToast: React.FC<DriverNotificationToastProps> = ({
    notification,
    onView,
    onDismiss
}) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => {
            onDismiss();
        }, 10000);
        return () => clearTimeout(timer);
    }, [notification, onDismiss]);

    if (!notification) return null;

    const isAccepted = notification.type === 'offer_accepted';
    const clientName = notification.clientName || 'Passenger';
    const pickup = notification.pickup ? notification.pickup.split(',')[0] : 'pickup point';
    const fare = notification.fare;

    return (
        <Animated.View
            entering={FadeInUp.springify().damping(15)}
            exiting={FadeOutUp.duration(200)}
            style={[styles.wrapper, { top: insets.top + 8 }]}
            pointerEvents="box-none"
        >
            <BlurView
                intensity={isDark ? 85 : 95}
                tint={isDark ? 'dark' : 'light'}
                style={[
                    styles.container,
                    {
                        backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.98)',
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'
                    }
                ]}
            >
                {/* Icon badge */}
                <View style={[styles.iconContainer, { backgroundColor: isAccepted ? '#10b98120' : theme.primary + '20' }]}>
                    {isAccepted ? (
                        <CheckCircle2 size={18} color="#10b981" />
                    ) : (
                        <Users size={18} color={theme.primary} />
                    )}
                </View>

                {/* Content */}
                <TouchableOpacity
                    style={styles.textContainer}
                    activeOpacity={0.7}
                    onPress={() => onView(notification.routeId)}
                >
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {isAccepted ? 'Offer Accepted!' : 'Matching passenger nearby'}
                        </Text>
                        {fare !== undefined && fare > 0 && (
                            <Text style={[styles.priceTag, { color: isAccepted ? '#10b981' : theme.primary }]}>
                                {fare} MAD
                            </Text>
                        )}
                    </View>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                        {isAccepted
                            ? `${clientName} confirmed booking on your route`
                            : `${clientName} waiting near ${pickup}`}
                    </Text>
                </TouchableOpacity>

                {/* View Action */}
                <TouchableOpacity
                    style={[styles.viewButton, { backgroundColor: isAccepted ? '#10b981' : theme.primary }]}
                    activeOpacity={0.8}
                    onPress={() => onView(notification.routeId)}
                >
                    <Text style={styles.viewButtonText}>View</Text>
                    <ChevronRight size={14} color="#ffffff" />
                </TouchableOpacity>

                {/* Dismiss Action */}
                <TouchableOpacity
                    style={styles.dismissButton}
                    activeOpacity={0.7}
                    onPress={onDismiss}
                    accessibilityLabel="Dismiss notification"
                >
                    <X size={15} color={theme.textSecondary} />
                </TouchableOpacity>
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 18,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        flexShrink: 1,
    },
    priceTag: {
        fontSize: 12,
        fontWeight: '800',
        marginLeft: 6,
    },
    subtitle: {
        fontSize: 11,
        fontWeight: '500',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 2,
        marginRight: 6,
    },
    viewButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    dismissButton: {
        padding: 4,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
