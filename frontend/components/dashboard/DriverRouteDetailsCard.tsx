import React from 'react';
import { BlurView } from 'expo-blur';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import {
    Check,
    Clock,
    Navigation,
    Power,
    Send,
    Trash2,
    Users,
    User as UserIcon,
    X,
    ChevronDown,
    ChevronUp
} from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { Route } from '../../types';

interface DriverRouteDetailsCardProps {
    route: Route;
    onClose: () => void;
    onDelete?: (routeId: string) => void;
    isDeleting?: boolean;
    isOnline?: boolean;
    onToggleStatus?: () => void;
    isFindingOpen?: boolean;
    onToggleFinding?: () => void;
    matchedClients?: any[];
    onInviteClient?: (clientRouteId: string, fare: number) => void;
    isInviting?: boolean;
}

export const DriverRouteDetailsCard: React.FC<DriverRouteDetailsCardProps> = ({
    route,
    onClose,
    onDelete,
    isDeleting = false,
    isOnline = false,
    onToggleStatus,
    isFindingOpen = false,
    onToggleFinding,
    matchedClients = [],
    onInviteClient,
    isInviting = false
}) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const routeId = route.id || (route as any)._id;
    const startAddr = route.startPoint?.address || 'Start location';
    const endAddr = route.endPoint?.address || 'Destination';
    const scheduleTime = route.timeStart || (route as any).schedule?.time;
    const arrivalTime = route.timeArrival || (route as any).schedule?.timeArrival;
    const days = route.days || (route as any).schedule?.days || [];
    const status = (route.status || 'active').toUpperCase();

    const getStatusBadge = () => {
        switch (status) {
            case 'ACTIVE':
                return { bg: '#dcfce7', text: '#15803d', label: 'Active Route' };
            case 'DRAFT':
            case 'PENDING':
                return { bg: '#fef3c7', text: '#b45309', label: 'Ready' };
            default:
                return { bg: '#e0f2fe', text: '#0369a1', label: status };
        }
    };

    const badge = getStatusBadge();

    return (
        <BlurView intensity={isDark ? 80 : 90} tint={isDark ? 'dark' : 'light'} style={[
            styles.container,
            {
                backgroundColor: isDark ? 'rgba(28, 28, 30, 0.75)' : 'rgba(255, 255, 255, 0.75)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1.5,
            }
        ]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                    {isOnline && (
                        <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                            <View style={styles.onlineDot} />
                            <Text style={[styles.badgeText, { color: '#15803d' }]}>Live on corridor</Text>
                        </View>
                    )}
                </View>

                <View style={styles.headerActions}>
                    {onDelete && (
                        <TouchableOpacity
                            onPress={() => onDelete(routeId)}
                            style={[styles.iconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                            disabled={isDeleting}
                            accessibilityLabel="Delete route"
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                                <Trash2 size={15} color="#ef4444" />
                            )}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={onClose}
                        style={[styles.iconBtn, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}
                        accessibilityLabel="Close route details"
                    >
                        <X size={16} color={theme.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Route Path Indicator */}
            <View style={styles.routePath}>
                <View style={styles.indicatorCol}>
                    <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                    <View style={[styles.line, { backgroundColor: isDark ? '#38383a' : '#e2e8f0' }]} />
                    <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                </View>
                <View style={styles.addressesCol}>
                    <View style={styles.addrBlock}>
                        <Text style={[styles.addrLabel, { color: theme.textSecondary }]}>Departure</Text>
                        <Text style={[styles.addrText, { color: theme.text }]} numberOfLines={1}>{startAddr}</Text>
                    </View>
                    <View style={styles.addrBlock}>
                        <Text style={[styles.addrLabel, { color: theme.textSecondary }]}>Destination</Text>
                        <Text style={[styles.addrText, { color: theme.text }]} numberOfLines={1}>{endAddr}</Text>
                    </View>
                </View>
            </View>

            {/* Meta Row: Time & Days */}
            <View style={[styles.metaRow, { borderTopColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                <View style={styles.metaItem}>
                    <Clock size={14} color={theme.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        {scheduleTime ? `${scheduleTime}${arrivalTime ? ` → ${arrivalTime}` : ''}` : 'Flexible'}
                        {days.length > 0 ? ` (${days.slice(0, 3).join(', ')})` : ''}
                    </Text>
                </View>
            </View>

            {/* Contextual Finding Clients Section */}
            {isOnline ? (
                <View style={styles.findingSection}>
                    <TouchableOpacity
                        style={[
                            styles.findingToggleBtn,
                            {
                                backgroundColor: isFindingOpen ? theme.primary + '15' : isDark ? '#2c2c2e' : '#f3f4f6',
                                borderColor: isFindingOpen ? theme.primary : 'transparent'
                            }
                        ]}
                        onPress={onToggleFinding}
                        activeOpacity={0.8}
                    >
                        <View style={styles.findingToggleLeft}>
                            <Users size={16} color={isFindingOpen ? theme.primary : theme.text} />
                            <Text style={[styles.findingToggleText, { color: isFindingOpen ? theme.primary : theme.text }]}>
                                Passengers on this route
                            </Text>
                            <View style={[styles.countBadge, { backgroundColor: isFindingOpen ? theme.primary : theme.textSecondary }]}>
                                <Text style={styles.countBadgeText}>{matchedClients.length}</Text>
                            </View>
                        </View>
                        {isFindingOpen ? (
                            <ChevronUp size={16} color={theme.primary} />
                        ) : (
                            <ChevronDown size={16} color={theme.textSecondary} />
                        )}
                    </TouchableOpacity>

                    {/* Expandable Matched Passengers List */}
                    {isFindingOpen && (
                        <View style={styles.matchedClientsContainer}>
                            {matchedClients.length === 0 ? (
                                <View style={[styles.emptyMatchesBox, { backgroundColor: isDark ? '#232326' : '#f9fafb' }]}>
                                    <Text style={[styles.emptyMatchesText, { color: theme.textSecondary }]}>
                                        Scanning for passengers along your corridor...
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView
                                    style={styles.clientsScrollView}
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator={false}
                                >
                                    {matchedClients.map((matchItem: any, idx: number) => {
                                        const r = matchItem.route || matchItem;
                                        const clientUser = r.userId;
                                        const clientName = clientUser?.fullName || `Passenger #${idx + 1}`;
                                        const pickup = r.startPoint?.address ? r.startPoint.address.split(',')[0] : 'Pickup';
                                        const dropoff = r.endPoint?.address ? r.endPoint.address.split(',')[0] : 'Dropoff';
                                        const fare = r.price?.amount ?? r.price ?? 20;
                                        const isPending = matchItem.requestStatus === 'pending' || matchItem.requestStatus === 'DRIVER_PROPOSED';
                                        const isAccepted = matchItem.requestStatus === 'accepted' || matchItem.requestStatus === 'ACCEPTED';
                                        const clientRouteId = r.id || r._id;

                                        return (
                                            <View
                                                key={clientRouteId || idx}
                                                style={[
                                                    styles.clientMatchCard,
                                                    {
                                                        backgroundColor: isDark ? '#232326' : '#f9fafb',
                                                        borderColor: isDark ? '#333336' : '#e5e7eb'
                                                    }
                                                ]}
                                            >
                                                <View style={styles.clientMatchHeader}>
                                                    <View style={[styles.clientAvatar, { backgroundColor: theme.primary }]}>
                                                        {clientUser?.photoURL ? (
                                                            <Image source={{ uri: clientUser.photoURL }} style={styles.avatarImg} />
                                                        ) : (
                                                            <UserIcon size={14} color="#fff" />
                                                        )}
                                                    </View>
                                                    <View style={styles.clientInfo}>
                                                        <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>
                                                            {clientName}
                                                        </Text>
                                                        <Text style={[styles.clientRouteSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                                            {pickup} → {dropoff}
                                                        </Text>
                                                        {matchItem.match?.detourKm !== undefined && (
                                                            <Text style={{ fontSize: 11, color: '#06b6d4', marginTop: 2, fontWeight: '600' }}>
                                                                📍 +{matchItem.match.detourKm} km detour (~+{matchItem.match.detourMinutes || 5} min)
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <View style={styles.fareTag}>
                                                        <Text style={styles.fareText}>{fare} MAD</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.clientMatchFooter}>
                                                    {isAccepted ? (
                                                        <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                                                            <Check size={12} color="#15803d" />
                                                            <Text style={{ color: '#15803d', fontWeight: '700', fontSize: 11, marginLeft: 4 }}>Joined</Text>
                                                        </View>
                                                    ) : isPending ? (
                                                        <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                                                            <Text style={{ color: '#b45309', fontWeight: '700', fontSize: 11 }}>Invited</Text>
                                                        </View>
                                                    ) : (
                                                        <TouchableOpacity
                                                            style={[styles.inviteBtn, { backgroundColor: theme.primary }]}
                                                            disabled={isInviting}
                                                            onPress={() => onInviteClient?.(clientRouteId, fare)}
                                                        >
                                                            <Send size={11} color="#fff" />
                                                            <Text style={styles.inviteBtnText}>Invite</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.offlineActionRow}>
                    <TouchableOpacity
                        style={[styles.goOnlineBtn, { backgroundColor: '#10b981' }]}
                        onPress={onToggleStatus}
                        activeOpacity={0.8}
                    >
                        <Power size={15} color="#fff" />
                        <Text style={styles.goOnlineBtnText}>Go Online on this route</Text>
                    </TouchableOpacity>
                </View>
            )}
        </BlurView>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 5,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    routePath: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    indicatorCol: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    line: {
        width: 2,
        height: 20,
        marginVertical: 2,
    },
    addressesCol: {
        flex: 1,
        gap: 8,
    },
    addrBlock: {
        gap: 1,
    },
    addrLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    addrText: {
        fontSize: 13,
        fontWeight: '700',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '500',
    },
    // Finding Section
    findingSection: {
        marginTop: 2,
        gap: 8,
    },
    findingToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    findingToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    findingToggleText: {
        fontSize: 13,
        fontWeight: '700',
    },
    countBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    matchedClientsContainer: {
        maxHeight: 180,
    },
    emptyMatchesBox: {
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyMatchesText: {
        fontSize: 12,
        fontWeight: '500',
    },
    clientsScrollView: {
        maxHeight: 160,
    },
    clientMatchCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 10,
        marginBottom: 6,
        gap: 8,
    },
    clientMatchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    clientAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 12,
        fontWeight: '700',
    },
    clientRouteSub: {
        fontSize: 10,
        marginTop: 1,
    },
    fareTag: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    fareText: {
        color: '#10b981',
        fontSize: 11,
        fontWeight: '800',
    },
    clientMatchFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    inviteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    inviteBtnText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    offlineActionRow: {
        paddingTop: 4,
    },
    goOnlineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 12,
    },
    goOnlineBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
});
