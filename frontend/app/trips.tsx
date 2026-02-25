import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Calendar, Navigation, Timer, User } from 'lucide-react-native';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../constants/theme';
import { useTrips } from '../hooks/api/useTripQueries';
import { useCountdownDate } from '../hooks/useCountdown';
import { useAuthStore } from '../store/useAuthStore';
import { Trip } from '../types';
import { getNextTripOccurrence, IN_PROGRESS_STATUSES } from '../utils/timeUtils';

const TripItemCard = ({ item, index, theme, router, user }: { item: Trip, index: number, theme: any, router: any, user: any }) => {
    let targetDate: Date | null = null;
    const isInProgress = IN_PROGRESS_STATUSES.includes(item.status) || item.status === 'active';

    if (!isInProgress && item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && item.routeId) {
        targetDate = getNextTripOccurrence(item.routeId.timeStart, item.routeId.days || []);
    }
    const countdownStr = useCountdownDate(targetDate);
    const isWithin10Mins = targetDate ? (targetDate.getTime() - Date.now()) <= 10 * 60 * 1000 : false;
    const shouldShowGoToTrip = isInProgress || item.status === 'STARTING_SOON' || isWithin10Mins;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100).springify()}
        >
            <TouchableOpacity
                style={[styles.tripCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => router.push({ pathname: '/modal', params: { type: 'trip_details', id: item.id } })}
            >
                <View style={styles.tripHeader}>
                    <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#10b981' : item.status === 'COMPLETED' ? '#3b82f6' : '#f59e0b' }]} />
                        <Text style={[styles.statusText, { color: theme.text }]}>{item.status.toUpperCase()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.dateText, { color: theme.icon }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        {isInProgress ? (
                            <View style={[styles.countdownBadge, { backgroundColor: '#ef4444' + '15' }]}>
                                <View style={[styles.statusDot, { backgroundColor: '#ef4444', marginRight: 4 }]} />
                                <Text style={[styles.countdownText, { color: '#ef4444' }]}>IN TRIP</Text>
                            </View>
                        ) : countdownStr ? (
                            <View style={[styles.countdownBadge, { backgroundColor: theme.primary + '15' }]}>
                                <Timer size={12} color={theme.primary} />
                                <Text style={[styles.countdownText, { color: theme.primary }]}>{countdownStr}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View style={styles.trajectory}>
                    <View style={styles.routeIcon}>
                        <Navigation size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.addr, { color: theme.text }]} numberOfLines={1}>{item.routeId?.startPoint?.address}</Text>
                        <Text style={[styles.addr, { color: theme.text, marginTop: 4 }]} numberOfLines={1}>{item.routeId?.endPoint?.address}</Text>
                    </View>
                </View>

                <View style={[styles.participants, { borderTopColor: theme.border }]}>
                    <View style={styles.avatars}>
                        <View style={[styles.avatarBox, { zIndex: 10 }]}>
                            {item.driverId?.photoURL ? (
                                <Image source={{ uri: item.driverId.photoURL }} style={styles.avatar} contentFit="cover" transition={500} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: theme.border }]}>
                                    <User size={14} color={theme.icon} />
                                </View>
                            )}
                            <View style={styles.driverLabel}>
                                <Text style={styles.labelTxt}>D</Text>
                            </View>
                        </View>
                        {item.clients.map((c: any, i: number) => (
                            <View key={i} style={[styles.avatarBox, { marginLeft: -12, zIndex: 5 - i }]}>
                                {c.userId?.photoURL ? (
                                    <Image source={{ uri: c.userId.photoURL }} style={styles.avatar} contentFit="cover" transition={500} />
                                ) : (
                                    <View style={[styles.avatar, { backgroundColor: theme.border }]}>
                                        <User size={14} color={theme.icon} />
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                    <Text style={[styles.participantsCount, { color: theme.icon }]}>
                        {1 + item.clients.length} Participants
                    </Text>
                </View>

                {user?.role === 'driver' && item.status !== 'COMPLETED' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                        <TouchableOpacity
                            style={[styles.findBtn, { backgroundColor: theme.primary, flex: 1, marginTop: 0 }]}
                            onPress={() => router.push({
                                pathname: '/(driver)/find-clients',
                                params: { tripId: item.id, routeId: item.routeId?.id }
                            })}
                        >
                            <User size={18} color="#fff" />
                            <Text style={styles.findBtnText}>Clients</Text>
                        </TouchableOpacity>

                        {shouldShowGoToTrip && (
                            <TouchableOpacity
                                style={[styles.findBtn, { backgroundColor: '#10b981', flex: 1, marginTop: 0 }]}
                                onPress={() => router.push({ pathname: '/active-trip/[id]', params: { id: item.id } })}
                            >
                                <Navigation size={18} color="#fff" />
                                <Text style={styles.findBtnText}>Go to Trip</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function TripsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { data: trips, isLoading } = useTrips();
    const user = useAuthStore((state: any) => state.user);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text className="text-xl font-bold text-red-500">Test Tailwind CSS</Text>
            {isLoading && (!trips || (trips as Trip[]).length === 0) ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={trips || []}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => <TripItemCard item={item} index={index} theme={theme} router={router} user={user} />}
                    contentContainerStyle={[styles.list, { paddingTop: 84 }]}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Calendar size={48} color={theme.icon} />
                            <Text style={[styles.emptyText, { color: theme.text }]}>No trips yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 24, gap: 20 },
    tripCard: { borderRadius: 28, borderWidth: 1, padding: 20, gap: 16 },
    tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    countdownBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
    countdownText: { fontSize: 10, fontWeight: '700' },
    dateText: { fontSize: 12, fontWeight: '600' },
    trajectory: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    routeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' },
    addr: { fontSize: 14, fontWeight: '700' },
    participants: { borderTopWidth: 1, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    avatars: { flexDirection: 'row', alignItems: 'center' },
    avatarBox: { position: 'relative' },
    avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#fff' },
    driverLabel: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#10b981', width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
    labelTxt: { color: '#fff', fontSize: 8, fontWeight: '900' },
    participantsCount: { fontSize: 12, fontWeight: '700' },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
    emptyText: { fontSize: 18, fontWeight: '700' },
    findBtn: { marginTop: 16, flexDirection: 'row', height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
    findBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' }
});
