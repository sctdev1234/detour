import { Car, Clock, Navigation, Search, Trash2, X } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View, ActivityIndicator } from 'react-native';
import { Colors } from '../../../constants/theme';
import { Route } from '../../../types';
import { RouteService } from '../../../services/RouteService';

interface RouteDetailsCardProps {
    route: Route;
    onClose: () => void;
    onDelete?: (routeId: string) => void;
    isDeleting?: boolean;
    isFinding?: boolean;
    offersCount?: number;
    onOpenFindingPanel?: () => void;
    onFindDriver?: (route: Route) => void;
    isInitiatingFind?: boolean;
}

export const RouteDetailsCard: React.FC<RouteDetailsCardProps> = ({
    route,
    onClose,
    onDelete,
    isDeleting = false,
    isFinding = false,
    offersCount = 0,
    onOpenFindingPanel,
    onFindDriver,
    isInitiatingFind = false,
}) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const [startAddr, setStartAddr] = React.useState(route.startPoint?.address || 'Pickup');
    const [endAddr, setEndAddr] = React.useState(route.endPoint?.address || 'Destination');

    React.useEffect(() => {
        let isMounted = true;
        const initialStart = route.startPoint?.address;
        const initialEnd = route.endPoint?.address;

        if (initialStart && initialStart !== 'Pickup' && initialStart !== 'Current Location') {
            setStartAddr(initialStart);
        } else if (route.startPoint?.latitude && route.startPoint?.longitude) {
            RouteService.reverseGeocode(route.startPoint.latitude, route.startPoint.longitude)
                .then(addr => {
                    if (isMounted && addr) setStartAddr(addr);
                })
                .catch(() => {});
        }

        if (initialEnd && initialEnd !== 'Destination') {
            setEndAddr(initialEnd);
        } else if (route.endPoint?.latitude && route.endPoint?.longitude) {
            RouteService.reverseGeocode(route.endPoint.latitude, route.endPoint.longitude)
                .then(addr => {
                    if (isMounted && addr) setEndAddr(addr);
                })
                .catch(() => {});
        }

        return () => { isMounted = false; };
    }, [route.id, route.startPoint?.latitude, route.startPoint?.longitude, route.startPoint?.address, route.endPoint?.latitude, route.endPoint?.longitude, route.endPoint?.address]);
    const scheduleTime = route.timeStart || (route as any).schedule?.time;
    const days = route.days || (route as any).schedule?.days || [];
    const status = (route.status || 'active').toUpperCase();

    const getStatusBadge = () => {
        switch (status) {
            case 'ACTIVE':
                return { bg: '#dcfce7', text: '#15803d', label: 'Active Route' };
            case 'DRAFT':
                return { bg: '#fef3c7', text: '#b45309', label: 'Draft' };
            case 'COMPLETED':
                return { bg: '#f1f5f9', text: '#475569', label: 'Completed' };
            default:
                return { bg: '#e0f2fe', text: '#0369a1', label: status };
        }
    };

    const badge = getStatusBadge();

    return (
        <View style={[
            styles.container, 
            { 
                backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' 
            }
        ]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
                <TouchableOpacity 
                    onPress={onClose} 
                    style={[styles.closeBtn, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}
                    accessibilityLabel="Close route details"
                >
                    <X size={16} color={theme.text} />
                </TouchableOpacity>
            </View>

            {/* Route path points */}
            <View style={styles.routePath}>
                <View style={styles.indicatorCol}>
                    <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                    <View style={[styles.line, { backgroundColor: isDark ? '#38383a' : '#e2e8f0' }]} />
                    <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                </View>
                <View style={styles.addressesCol}>
                    <View style={styles.addrBlock}>
                        <Text style={[styles.addrLabel, { color: theme.text + '80' }]}>Pickup</Text>
                        <Text style={[styles.addrText, { color: theme.text }]} numberOfLines={1}>{startAddr}</Text>
                    </View>
                    <View style={styles.addrBlock}>
                        <Text style={[styles.addrLabel, { color: theme.text + '80' }]}>Destination</Text>
                        <Text style={[styles.addrText, { color: theme.text }]} numberOfLines={1}>{endAddr}</Text>
                    </View>
                </View>
            </View>

            {/* Details Footer: Schedule & Price */}
            <View style={[styles.metaRow, { borderTopColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                <View style={styles.metaItem}>
                    <Clock size={14} color={theme.text + '80'} />
                    <Text style={[styles.metaText, { color: theme.text + '99' }]}>
                        {scheduleTime ? scheduleTime : 'Anytime'} 
                        {days.length > 0 ? ` (${days.slice(0, 3).join(', ')})` : ''}
                    </Text>
                </View>

                {route.price !== undefined && route.price > 0 && (
                    <View style={styles.priceContainer}>
                        <Text style={[styles.priceAmount, { color: theme.primary }]}>{route.price} MAD</Text>
                    </View>
                )}
            </View>

            {/* Finding Drivers Reopen Banner */}
            {isFinding && onOpenFindingPanel && (
                <TouchableOpacity
                    style={[styles.findingBanner, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}
                    onPress={onOpenFindingPanel}
                    activeOpacity={0.7}
                >
                    <View style={styles.findingBannerLeft}>
                        <View style={[styles.pulseDotSmall, { backgroundColor: theme.primary }]} />
                        <Text style={[styles.findingBannerText, { color: theme.primary }]}>
                            {offersCount > 0 ? `${offersCount} Driver Offer${offersCount === 1 ? '' : 's'} Ready` : 'Finding Drivers...'}
                        </Text>
                    </View>
                    <View style={[styles.viewOffersPill, { backgroundColor: theme.primary }]}>
                        <Text style={styles.viewOffersPillText}>View Panel</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Find Driver Action Button for Idle Routes */}
            {!isFinding && onFindDriver && (
                <TouchableOpacity
                    style={[
                        styles.findDriverButton,
                        { backgroundColor: theme.primary },
                        isInitiatingFind && { opacity: 0.7 }
                    ]}
                    onPress={() => onFindDriver(route)}
                    activeOpacity={0.8}
                    disabled={isInitiatingFind}
                >
                    {isInitiatingFind ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <>
                            <Car size={16} color="#ffffff" />
                            <Text style={styles.findDriverButtonText}>Find a Driver</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}

            {/* Optional Actions */}
            {onDelete && (
                <View style={styles.actionRow}>
                    <TouchableOpacity 
                        style={[styles.deleteBtn, { opacity: isDeleting ? 0.6 : 1 }]}
                        onPress={() => onDelete(route.id)}
                        disabled={isDeleting}
                    >
                        <Trash2 size={14} color="#ef4444" />
                        <Text style={styles.deleteText}>Delete Route</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    routePath: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    indicatorCol: {
        alignItems: 'center',
        width: 16,
        paddingTop: 4,
        marginRight: 10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    line: {
        width: 2,
        height: 24,
        marginVertical: 4,
    },
    addressesCol: {
        flex: 1,
        gap: 8,
    },
    addrBlock: {
        justifyContent: 'center',
    },
    addrLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    addrText: {
        fontSize: 14,
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceAmount: {
        fontSize: 16,
        fontWeight: '800',
    },
    findingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 12,
    },
    findingBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pulseDotSmall: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    findingBannerText: {
        fontSize: 13,
        fontWeight: '700',
    },
    viewOffersPill: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    viewOffersPillText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    deleteText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '600',
    },
    findDriverButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    findDriverButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
});
