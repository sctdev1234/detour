import React, { useState } from 'react';
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
    CheckCircle2,
    Clock,
    KeyRound,
    MapPin,
    Navigation,
    Phone,
    Send,
    User as UserIcon,
    Users,
    X,
    AlertCircle
} from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { Route } from '../../types';

export interface DriverFindingClientsPanelProps {
    route: Route;
    matchedClients: any[];
    onClose: () => void;
    onInviteClient: (clientRouteId: string, fare: number) => void;
    isInviting?: boolean;
    onBoardPassenger?: (tripInstanceId: string, otp: string) => void;
}

type TabType = 'matched' | 'invited' | 'assigned';

export const DriverFindingClientsPanel: React.FC<DriverFindingClientsPanelProps> = ({
    route,
    matchedClients = [],
    onClose,
    onInviteClient,
    isInviting = false,
    onBoardPassenger
}) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const [activeTab, setActiveTab] = useState<TabType>('matched');
    const [otpInput, setOtpInput] = useState<Record<string, string>>({});

    // Categorize clients strictly by lifecycle (using offer/invitation requestStatus)
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

    const startAddr = route.startPoint?.address ? route.startPoint.address.split(',')[0] : 'Start';
    const endAddr = route.endPoint?.address ? route.endPoint.address.split(',')[0] : 'Destination';

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: isDark ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
            }
        ]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.corridorBadge, { backgroundColor: theme.primary + '18' }]}>
                        <Navigation size={14} color={theme.primary} />
                        <Text style={[styles.corridorText, { color: theme.primary }]}>
                            {startAddr} → {endAddr}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}
                    onPress={onClose}
                    accessibilityLabel="Close finding clients panel"
                >
                    <X size={16} color={theme.text} />
                </TouchableOpacity>
            </View>

            {/* Lifecycle Segmented Control */}
            <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1f1f22' : '#f1f5f9' }]}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'matched' && { backgroundColor: isDark ? '#2c2c2e' : '#fff' }]}
                    onPress={() => setActiveTab('matched')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'matched' ? theme.text : theme.textSecondary }]}>
                        Matched ({matchedList.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'invited' && { backgroundColor: isDark ? '#2c2c2e' : '#fff' }]}
                    onPress={() => setActiveTab('invited')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'invited' ? theme.text : theme.textSecondary }]}>
                        Invited ({invitedList.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'assigned' && { backgroundColor: isDark ? '#2c2c2e' : '#fff' }]}
                    onPress={() => setActiveTab('assigned')}
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
                            <Users size={28} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No new passenger requests on this corridor right now.
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
                                <View key={clientRouteId || idx} style={[styles.card, { borderColor: isDark ? '#333336' : '#e5e7eb' }]}>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                                            {clientUser?.photoURL ? (
                                                <Image source={{ uri: clientUser.photoURL }} style={styles.avatarImg} />
                                            ) : (
                                                <UserIcon size={14} color="#fff" />
                                            )}
                                        </View>
                                        <View style={styles.cardInfo}>
                                            <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>
                                                {clientName}
                                            </Text>
                                            <Text style={[styles.routeSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                                {pickup} → {dropoff}
                                            </Text>
                                            {m.match?.detourKm !== undefined ? (
                                                <Text style={[styles.corridorProximity, { color: '#06b6d4' }]}>
                                                    📍 +{m.match.detourKm} km detour (~+{m.match.detourMinutes || 5} min)
                                                </Text>
                                            ) : distMeters !== undefined ? (
                                                <Text style={[styles.corridorProximity, { color: '#06b6d4' }]}>
                                                    📍 {distMeters < 1000 ? `${distMeters}m` : `${(distMeters / 1000).toFixed(1)} km`} from your route
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={styles.fareBadge}>
                                            <Text style={styles.fareText}>{fare} MAD</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <TouchableOpacity
                                            style={[styles.inviteActionBtn, { backgroundColor: theme.primary }]}
                                            disabled={isInviting}
                                            onPress={() => onInviteClient(clientRouteId, fare)}
                                        >
                                            {isInviting ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Send size={12} color="#fff" />
                                                    <Text style={styles.inviteActionText}>Invite Passenger</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )
                )}

                {/* 2. INVITED CLIENTS / OFFER SENT */}
                {activeTab === 'invited' && (
                    invitedList.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Clock size={28} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No pending invitations. Invite matched passengers above.
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
                            const clientRouteId = r.id || r._id;

                            return (
                                <View key={clientRouteId || idx} style={[styles.card, { borderColor: '#f59e0b40', backgroundColor: '#fef3c710' }]}>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.avatar, { backgroundColor: '#f59e0b' }]}>
                                            {clientUser?.photoURL ? (
                                                <Image source={{ uri: clientUser.photoURL }} style={styles.avatarImg} />
                                            ) : (
                                                <UserIcon size={14} color="#fff" />
                                            )}
                                        </View>
                                        <View style={styles.cardInfo}>
                                            <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>
                                                {clientName}
                                            </Text>
                                            <Text style={[styles.routeSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                                {pickup} → {dropoff}
                                            </Text>
                                        </View>
                                        <View style={styles.fareBadge}>
                                            <Text style={styles.fareText}>{fare} MAD</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <View style={[styles.statusPill, { backgroundColor: '#fef3c7' }]}>
                                            <Clock size={12} color="#b45309" />
                                            <Text style={[styles.statusPillText, { color: '#b45309' }]}>
                                                Invitation Sent • Waiting for Client
                                            </Text>
                                        </View>
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
                            <CheckCircle2 size={28} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No confirmed passengers yet. Once a passenger accepts your offer, they will appear here.
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
                            const clientRouteId = r.id || r._id;
                            const phone = clientUser?.phone;

                            return (
                                <View key={clientRouteId || idx} style={[styles.card, { borderColor: '#10b98140', backgroundColor: '#dcfce710' }]}>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.avatar, { backgroundColor: '#10b981' }]}>
                                            {clientUser?.photoURL ? (
                                                <Image source={{ uri: clientUser.photoURL }} style={styles.avatarImg} />
                                            ) : (
                                                <UserIcon size={14} color="#fff" />
                                            )}
                                        </View>
                                        <View style={styles.cardInfo}>
                                            <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>
                                                {clientName}
                                            </Text>
                                            <Text style={[styles.routeSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                                {pickup} → {dropoff}
                                            </Text>
                                            {phone ? (
                                                <Text style={[styles.contactInfo, { color: theme.textSecondary }]}>
                                                    📞 {phone}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={[styles.fareBadge, { backgroundColor: '#dcfce7' }]}>
                                            <Text style={[styles.fareText, { color: '#15803d' }]}>{fare} MAD</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <View style={[styles.statusPill, { backgroundColor: '#dcfce7' }]}>
                                            <CheckCircle2 size={12} color="#15803d" />
                                            <Text style={[styles.statusPillText, { color: '#15803d' }]}>
                                                Confirmed Passenger • Seat Reserved
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 22,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        gap: 12,
        maxHeight: 340,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flex: 1,
    },
    corridorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    corridorText: {
        fontSize: 12,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabsRow: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 3,
        gap: 2,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
    },
    scrollList: {
        maxHeight: 220,
    },
    emptyBox: {
        paddingVertical: 32,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 18,
    },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 8,
        gap: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
        gap: 2,
    },
    clientName: {
        fontSize: 13,
        fontWeight: '700',
    },
    routeSub: {
        fontSize: 11,
    },
    corridorProximity: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    contactInfo: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    fareBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    fareText: {
        color: '#10b981',
        fontSize: 12,
        fontWeight: '800',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    inviteActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    inviteActionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
