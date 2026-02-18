import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AlertCircle, Bell, CheckCircle, Clock, MessageCircle, Send, User } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useReclamations } from '../hooks/api/useReclamationQueries';
import { useClientRequests, useDriverRequests, useTrips } from '../hooks/api/useTripQueries';
import { useAuthStore } from '../store/useAuthStore';

interface NotificationItem {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    time: string;
    color: string;
    onPress?: () => void;
}

export default function NotificationsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const { data: driverRequests } = useDriverRequests();
    const { data: clientRequests } = useClientRequests();
    const { data: trips } = useTrips();
    const { data: reclamations } = useReclamations();

    const notifications = useMemo(() => {
        const items: NotificationItem[] = [];

        // Pending driver requests
        const pendingDriverReqs = driverRequests?.filter((r: any) => r.status === 'pending') || [];
        pendingDriverReqs.forEach((req: any) => {
            items.push({
                id: `dr-${req.id}`,
                icon: <User size={20} color="#fff" />,
                title: 'New Join Request',
                subtitle: 'A passenger wants to join your trip',
                time: new Date(req.createdAt).toLocaleDateString(),
                color: '#F59E0B',
                onPress: () => router.push('/(driver)/requests'),
            });
        });

        // Client request status updates
        const answeredClientReqs = clientRequests?.filter((r: any) => r.status !== 'pending') || [];
        answeredClientReqs.slice(0, 5).forEach((req: any) => {
            const accepted = req.status === 'accepted';
            items.push({
                id: `cr-${req.id}`,
                icon: accepted ? <CheckCircle size={20} color="#fff" /> : <AlertCircle size={20} color="#fff" />,
                title: accepted ? 'Request Accepted' : 'Request Declined',
                subtitle: accepted ? 'Your trip request was approved!' : 'Your trip request was declined',
                time: new Date(req.createdAt).toLocaleDateString(),
                color: accepted ? '#10B981' : '#EF4444',
            });
        });

        // Recent trips
        const recentTrips = trips?.slice(0, 3) || [];
        recentTrips.forEach((trip: any) => {
            items.push({
                id: `trip-${trip.id}`,
                icon: <Send size={20} color="#fff" />,
                title: trip.status === 'active' ? 'Trip Active' : `Trip ${trip.status}`,
                subtitle: trip.routeId?.startPoint?.address
                    ? `${trip.routeId.startPoint.address.substring(0, 35)}...`
                    : 'View trip details',
                time: new Date(trip.createdAt).toLocaleDateString(),
                color: trip.status === 'active' ? '#3B82F6' : '#8B5CF6',
            });
        });

        // Reclamation updates and messages
        // Show ALL reclamations, but highlight those with recent activity or admin messages
        const relevantReclamations = reclamations || [];

        relevantReclamations.forEach((rec: any) => {
            // Determine if there's a new message from admin
            // We can check the last message. If it's from 'admin' or 'support', it's relevant.
            const messages = rec.messages || [];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const isAdminMessage = lastMessage?.sender === 'admin' || lastMessage?.sender === 'support'; // Adjust sender check based on backend

            // If status is resolved, show as resolved. 
            // If status is pending/open BUT has an admin message, show as "New Message"

            let title = `Reclamation ${rec.status}`;
            let subtitle = rec.subject;
            let icon = <AlertCircle size={20} color="#fff" />;
            let color = '#F59E0B'; // Default orange (pending)

            if (rec.status === 'resolved') {
                title = 'Reclamation Resolved';
                color = '#10B981'; // Green
                icon = <CheckCircle size={20} color="#fff" />;
            } else if (isAdminMessage) {
                title = 'New Message from Support';
                subtitle = lastMessage?.content || 'You have a new reply.';
                color = '#3B82F6'; // Blue for info/message
                icon = <MessageCircle size={20} color="#fff" />;
            }

            items.push({
                id: `rec-${rec.id}`,
                icon,
                title,
                subtitle: subtitle.length > 50 ? subtitle.substring(0, 50) + '...' : subtitle,
                time: new Date(rec.updatedAt || rec.createdAt).toLocaleDateString(),
                color,
                onPress: () => router.push({
                    pathname: '/reclamations/[id]',
                    params: { id: rec.id }
                })
            });
        });

        // Sort by most recent
        items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        return items;
    }, [driverRequests, clientRequests, trips, reclamations]);

    const renderItem = ({ item, index }: { item: NotificationItem; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={item.onPress}
                activeOpacity={item.onPress ? 0.7 : 1}
            >
                <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                    {item.icon}
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.icon }]} numberOfLines={2}>{item.subtitle}</Text>
                </View>
                <Text style={[styles.cardTime, { color: theme.icon }]}>{item.time}</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={colorScheme === 'dark' ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 16 }]}
            >
                <View style={styles.headerContent}>
                    <Bell size={28} color="#fff" />
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <Text style={styles.headerSubtitle}>
                        {notifications.length} update{notifications.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </LinearGradient>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Clock size={48} color={theme.border} />
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
                        <Text style={[styles.emptyText, { color: theme.icon }]}>No new notifications</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 28,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginTop: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
    },
    list: {
        padding: 20,
        gap: 12,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 14,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        gap: 4,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    cardTime: {
        fontSize: 11,
        fontWeight: '600',
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.7,
    },
});
