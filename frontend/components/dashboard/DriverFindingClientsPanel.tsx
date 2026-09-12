import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Dimensions
} from 'react-native';
import {
    CheckCircle2,
    Clock,
    User as UserIcon,
    Users,
    X,
    Send,
    Search
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

    const handleTabPress = (tab: TabType, index: number) => {
        setActiveTab(tab);
    };

    const tabIndex = activeTab === 'matched' ? 0 : activeTab === 'invited' ? 1 : 2;
    const tabIndicatorStyle = {
        transform: [{ translateX: tabIndex * ((Dimensions.get('window').width - 32 - 12) / 3) }]
    };

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

    const startAddr = route.startPoint?.address ? route.startPoint.address.split(',')[0] : 'Start';
    const endAddr = route.endPoint?.address ? route.endPoint.address.split(',')[0] : 'Destination';

    return (
        <View style={styles.shadowContainer}>
            <View 
                style={[
                    styles.container, 
                    { 
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                    }
                ]}
            >
                {/* Header: Vertical Timeline */}
                <View style={styles.header}>
                    <View style={styles.timelineContainer}>
                        <View style={styles.timelineGraphic}>
                            <View style={styles.pickupDot} />
                            <View style={styles.timelineLine} />
                            <View style={styles.dropoffDot} />
                        </View>
                        <View style={styles.timelineAddresses}>
                            <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>{startAddr}</Text>
                            <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>{endAddr}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        onPress={onClose}
                    >
                        <X size={18} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Segmented Control Tabs */}
                <View style={[styles.tabsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}>
                    <TouchableOpacity 
                        style={[styles.tabBtn, activeTab === 'matched' && styles.activeTabBtn]} 
                        onPress={() => handleTabPress('matched', 0)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'matched' ? theme.text : theme.textSecondary }]}>
                            Matched ({matchedList.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabBtn, activeTab === 'invited' && styles.activeTabBtn]} 
                        onPress={() => handleTabPress('invited', 1)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'invited' ? theme.text : theme.textSecondary }]}>
                            Invited ({invitedList.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabBtn, activeTab === 'assigned' && styles.activeTabBtn]} 
                        onPress={() => handleTabPress('assigned', 2)}
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
                                    <View key={clientRouteId || idx} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
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
                                                onPress={() => onInviteClient(clientRouteId, fare)}
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
        </View>
    );
};

const styles = StyleSheet.create({
    shadowContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
        marginHorizontal: 16,
    },
    container: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        gap: 16,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timelineContainer: {
        flexDirection: 'row',
        flex: 1,
        gap: 12,
        backgroundColor: 'rgba(150,150,150,0.05)',
        padding: 10,
        borderRadius: 14,
        marginRight: 10,
    },
    timelineGraphic: {
        alignItems: 'center',
        width: 14,
        paddingTop: 4,
        paddingBottom: 4,
    },
    pickupDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: '#dcfce7',
        zIndex: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#d1d5db',
        marginVertical: -2,
        zIndex: 1,
    },
    dropoffDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: '#fee2e2',
        zIndex: 2,
    },
    timelineAddresses: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 1,
        gap: 16,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '700',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
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
        maxHeight: 300,
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
