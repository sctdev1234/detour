import React, { useState } from 'react';
import { BlurView } from 'expo-blur';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Dimensions
} from 'react-native';
import {
    Check,
    CheckCircle2,
    Clock,
    Navigation,
    Power,
    Send,
    Trash2,
    Users,
    User as UserIcon,
    X,
    Search,
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

type TabType = 'matched' | 'invited' | 'assigned';

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

    const [activeTab, setActiveTab] = useState<TabType>('matched');

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
            case 'MATCHING':
                return { bg: '#dcfce7', text: '#15803d', label: 'Active Route' };
            case 'DRAFT':
            case 'PENDING':
                return { bg: '#fef3c7', text: '#b45309', label: 'Ready' };
            default:
                return { bg: '#e0f2fe', text: '#0369a1', label: status };
        }
    };

    const badge = getStatusBadge();

    // Categorize clients
    const matchedList = matchedClients.filter((m: any) => {
        const s = (m.requestStatus || '').toUpperCase();
        return s !== 'ACCEPTED' && s !== 'DRIVER_PROPOSED' && s !== 'PENDING' && s !== 'BOOKED' && s !== 'REJECTED' && s !== 'EXPIRED';
    });
    const invitedList = matchedClients.filter((m: any) => {
        const s = (m.requestStatus || '').toUpperCase();
        return s === 'DRIVER_PROPOSED' || s === 'PENDING';
    });
    const assignedList = matchedClients.filter((m: any) => {
        const s = (m.requestStatus || '').toUpperCase();
        return s === 'ACCEPTED' || s === 'BOOKED' || s === 'ASSIGNED' || s === 'BOARDED';
    });

    const handleTabPress = (tab: TabType) => {
        setActiveTab(tab);
    };

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios' ? { intensity: isDark ? 80 : 90, tint: isDark ? 'dark' : 'light' as any } : {};

    return (
        <Container {...containerProps} style={[
            styles.container,
            {
                backgroundColor: isDark ? (Platform.OS === 'ios' ? 'rgba(28, 28, 30, 0.75)' : 'rgba(28, 28, 30, 0.95)') : (Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.98)'),
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
                    {isFindingOpen && (
                        <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                            <View style={styles.onlineDot} />
                            <Text style={[styles.badgeText, { color: '#15803d' }]}>Live on corridor</Text>
                        </View>
                    )}
                </View>

                <View style={styles.headerActions}>
                    {onDelete && !isFindingOpen && (
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

            {/* Contextual Action: Tabs or Go Online */}
            {isFindingOpen ? (
                <View style={styles.findingSection}>
                    {/* Segmented Control Tabs */}
                    <View style={[styles.tabsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'matched' && styles.activeTabBtn]} 
                            onPress={() => handleTabPress('matched')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'matched' ? theme.text : theme.textSecondary }]}>
                                Matched ({matchedList.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'invited' && styles.activeTabBtn]} 
                            onPress={() => handleTabPress('invited')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'invited' ? theme.text : theme.textSecondary }]}>
                                Invited ({invitedList.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'assigned' && styles.activeTabBtn]} 
                            onPress={() => handleTabPress('assigned')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'assigned' ? '#10b981' : theme.textSecondary }]}>
                                Assigned ({assignedList.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content List */}
                    <ScrollView style={styles.scrollList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {/* 1. MATCHED CLIENTS */}
                        {activeTab === 'matched' && (
                            matchedList.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <View style={styles.radarContainer}>
                                        <View style={[styles.radarRing, { borderColor: theme.primary, borderWidth: 1, transform: [{scale: 1.8}], opacity: 0.1 }]} />
                                        <View style={[styles.radarRing, { borderColor: theme.primary, borderWidth: 2, transform: [{scale: 1.3}], opacity: 0.25 }]} />
                                        <View style={[styles.radarCenter, { backgroundColor: theme.primary }]}>
                                            <ActivityIndicator size="small" color="#fff" />
                                        </View>
                                    </View>
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                        Scanning corridor for passengers...
                                    </Text>
                                </View>
                            ) : (
                                matchedList.map((m: any, idx: number) => {
                                    const r = m.route || m;
                                    const clientUser = r.userId;
                                    const clientName = clientUser?.fullName || `Passenger #${idx + 1}`;
                                    const pickup = r.startPoint?.address ? r.startPoint.address.split(',')[0] : 'Pickup';
                                    const dropoff = r.endPoint?.address ? r.endPoint.address.split(',')[0] : 'Dropoff';
                                    const fare = r.price?.amount ?? r.price ?? 20;
                                    const clientRouteId = r.id || r._id;
                                    const distMeters = m.match?.pickupDistanceMeters;

                                    return (
                                        <View key={clientRouteId || idx} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDark ? '#333336' : '#e5e7eb', borderWidth: 1 }]}>
                                            <View style={styles.cardHeader}>
                                                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                                                    {clientUser?.photoURL ? (
                                                        <Image source={{ uri: clientUser.photoURL }} style={styles.avatarImg} />
                                                    ) : (
                                                        <UserIcon size={16} color="#fff" />
                                                    )}
                                                </View>
                                                <View style={styles.cardInfo}>
                                                    <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>
                                                        {clientName}
                                                    </Text>
                                                    <Text style={[styles.routeSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                                        {pickup} → {dropoff}
                                                    </Text>
                                                    {distMeters !== undefined && (
                                                        <Text style={[styles.corridorProximity, { color: theme.primary }]}>
                                                            📍 {distMeters < 1000 ? `${distMeters}m` : `${(distMeters / 1000).toFixed(1)} km`} from your route
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={[styles.fareBadge, { backgroundColor: theme.primary + '15' }]}>
                                                    <Text style={[styles.fareText, { color: theme.primary }]}>{fare} MAD</Text>
                                                </View>
                                            </View>
                                            <View style={styles.cardFooter}>
                                                <TouchableOpacity
                                                    style={[styles.inviteActionBtn, { backgroundColor: theme.primary }]}
                                                    disabled={isInviting}
                                                    onPress={() => onInviteClient?.(clientRouteId, fare)}
                                                    activeOpacity={0.8}
                                                >
                                                    {isInviting ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <>
                                                            <Text style={styles.inviteActionText}>Send Offer</Text>
                                                            <Send size={14} color="#fff" />
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })
                            )
                        )}

                        {/* 2. INVITED CLIENTS */}
                        {activeTab === 'invited' && (
                            invitedList.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <Clock size={36} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                        No pending invitations. Invite matched passengers.
                                    </Text>
                                </View>
                            ) : (
                                invitedList.map((m: any, idx: number) => {
                                    const r = m.route || m;
                                    const clientUser = r.userId;
                                    const clientName = clientUser?.fullName || `Passenger #${idx + 1}`;
                                    const pickup = r.startPoint?.address ? r.startPoint.address.split(',')[0] : 'Pickup';
                                    const dropoff = r.endPoint?.address ? r.endPoint.address.split(',')[0] : 'Dropoff';
                                    const fare = r.price?.amount ?? r.price ?? 20;

                                    return (
                                        <View key={r.id || idx} style={[styles.card, { backgroundColor: '#fef3c720', borderColor: '#f59e0b40', borderWidth: 1 }]}>
                                            <View style={styles.cardHeader}>
                                                <View style={[styles.avatar, { backgroundColor: '#f59e0b' }]}>
                                                    {clientUser?.photoURL ? (
                                                        <Image source={{ uri: clientUser.photoURL }} style={styles.avatarImg} />
                                                    ) : (
                                                        <UserIcon size={16} color="#fff" />
                                                    )}
                                                </View>
                                                <View style={styles.cardInfo}>
                                                    <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>{clientName}</Text>
                                                    <Text style={[styles.routeSub, { color: theme.textSecondary }]} numberOfLines={1}>{pickup} → {dropoff}</Text>
                                                </View>
                                                <View style={[styles.fareBadge, { backgroundColor: '#fef3c7' }]}>
                                                    <Text style={[styles.fareText, { color: '#d97706' }]}>{fare} MAD</Text>
                                                </View>
                                            </View>
                                            <View style={styles.statusPillLarge}>
                                                <Clock size={14} color="#d97706" />
                                                <Text style={[styles.statusPillText, { color: '#d97706' }]}>Waiting for passenger response...</Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )
                        )}

                        {/* 3. ASSIGNED PASSENGERS */}
                        {activeTab === 'assigned' && (
                            assignedList.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <CheckCircle2 size={36} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                        No confirmed passengers yet.
                                    </Text>
                                </View>
                            ) : (
                                assignedList.map((m: any, idx: number) => {
                                    const r = m.route || m;
                                    const clientUser = r.userId;
                                    const clientName = clientUser?.fullName || `Passenger #${idx + 1}`;
                                    const pickup = r.startPoint?.address ? r.startPoint.address.split(',')[0] : 'Pickup';
                                    const dropoff = r.endPoint?.address ? r.endPoint.address.split(',')[0] : 'Dropoff';
                                    const fare = r.price?.amount ?? r.price ?? 20;

                                    return (
                                        <View key={r.id || idx} style={[styles.card, { backgroundColor: '#dcfce720', borderColor: '#10b98140', borderWidth: 1 }]}>
                                            <View style={styles.cardHeader}>
                                                <View style={[styles.avatar, { backgroundColor: '#10b981' }]}>
                                                    {clientUser?.photoURL ? (
                                                        <Image source={{ uri: clientUser.photoURL }} style={styles.avatarImg} />
                                                    ) : (
                                                        <UserIcon size={16} color="#fff" />
                                                    )}
                                                </View>
                                                <View style={styles.cardInfo}>
                                                    <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>{clientName}</Text>
                                                    <Text style={[styles.routeSub, { color: theme.textSecondary }]} numberOfLines={1}>{pickup} → {dropoff}</Text>
                                                </View>
                                                <View style={[styles.fareBadge, { backgroundColor: '#dcfce7' }]}>
                                                    <Text style={[styles.fareText, { color: '#15803d' }]}>{fare} MAD</Text>
                                                </View>
                                            </View>
                                            <View style={styles.statusPillLarge}>
                                                <CheckCircle2 size={14} color="#15803d" />
                                                <Text style={[styles.statusPillText, { color: '#15803d' }]}>Seat Reserved • Head to pickup</Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )
                        )}
                    </ScrollView>
                </View>
            ) : (
                <View style={styles.offlineActionRow}>
                    <TouchableOpacity
                        style={[styles.goOnlineBtn, { backgroundColor: theme.primary }]}
                        onPress={onToggleStatus}
                        activeOpacity={0.8}
                    >
                        <Power size={15} color="#fff" />
                        <Text style={styles.goOnlineBtnText}>Go Online on this route</Text>
                    </TouchableOpacity>
                </View>
            )}
        </Container>
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
    // Finding Section (Merged from Panel)
    findingSection: {
        marginTop: 2,
        gap: 8,
    },
    tabsRow: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginTop: 4,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    activeTabBtn: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
    },
    scrollList: {
        maxHeight: 280,
    },
    emptyBox: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    radarContainer: {
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radarRing: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
    radarCenter: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    card: {
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        gap: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    cardInfo: {
        flex: 1,
        gap: 4,
    },
    clientName: {
        fontSize: 15,
        fontWeight: '700',
    },
    routeSub: {
        fontSize: 12,
    },
    corridorProximity: {
        fontSize: 12,
        fontWeight: '700',
    },
    fareBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    fareText: {
        fontSize: 14,
        fontWeight: '800',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(150,150,150,0.1)',
        paddingTop: 12,
    },
    inviteActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
    },
    inviteActionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    statusPillLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 10,
        marginTop: 4,
    },
    statusPillText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
