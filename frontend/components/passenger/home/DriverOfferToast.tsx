import { BlurView } from 'expo-blur';
import { Car, ChevronRight, X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/theme';

export interface OfferNotificationData {
    id: string;
    routeId: string;
    tripInstanceId?: string;
    driverName?: string;
    destination?: string;
    price?: number;
    offer: any;
}

interface DriverOfferToastProps {
    notification: OfferNotificationData | null;
    onView: (routeId: string, offer: any) => void;
    onDismiss: () => void;
}

export const DriverOfferToast: React.FC<DriverOfferToastProps> = ({
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

    const driverName = notification.driverName || 'Driver';
    const destination = notification.destination || 'your destination';
    const price = notification.price;

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
                        backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.95)',
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'
                    }
                ]}
            >
                {/* Icon badge */}
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                    <Car size={18} color={theme.primary} />
                </View>

                {/* Content */}
                <TouchableOpacity
                    style={styles.textContainer}
                    activeOpacity={0.7}
                    onPress={() => onView(notification.routeId, notification.offer)}
                >
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: theme.text }]}>Driver found for your route</Text>
                        {price !== undefined && price > 0 && (
                            <Text style={[styles.priceTag, { color: theme.primary }]}>{price} MAD</Text>
                        )}
                    </View>
                    <Text style={[styles.subtitle, { color: theme.text + '99' }]} numberOfLines={1}>
                        {driverName} offers a ride toward {destination}
                    </Text>
                </TouchableOpacity>

                {/* View Action */}
                <TouchableOpacity
                    style={[styles.viewButton, { backgroundColor: theme.primary }]}
                    activeOpacity={0.8}
                    onPress={() => onView(notification.routeId, notification.offer)}
                >
                    <Text style={styles.viewButtonText}>View</Text>
                    <ChevronRight size={14} color="#ffffff" />
                </TouchableOpacity>

                {/* Dismiss Action */}
                <TouchableOpacity
                    style={styles.closeBtn}
                    activeOpacity={0.7}
                    onPress={onDismiss}
                    accessibilityLabel="Dismiss offer notification"
                >
                    <X size={16} color={theme.text + '80'} />
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
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
        gap: 10,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    priceTag: {
        fontSize: 13,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
        gap: 2,
    },
    viewButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    }
});
