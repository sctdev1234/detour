import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Info, MapPin, Send, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTripStore } from '../../store/useTripStore';

export default function FindMatchesScreen() {
    const { routeId } = useLocalSearchParams<{ routeId: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { matches, findMatches, sendJoinRequest, isLoading } = useTripStore();

    useEffect(() => {
        if (routeId) {
            findMatches(routeId);
        }
    }, [routeId]);

    const handleJoin = async (tripId: string) => {
        if (!routeId) return;
        try {
            await sendJoinRequest(routeId, tripId);
            alert('Request sent!');
            router.back();
        } catch (error) {
            console.error(error);
            alert('Failed to send request');
        }
    };

    const renderMatchItem = ({ item }: { item: any }) => {
        return (
            <View style={[styles.matchCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.driverInfo}>
                    {item.route.userId?.photoURL ? (
                        <Image source={{ uri: item.route.userId.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
                            <User size={24} color={theme.icon} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.driverName, { color: theme.text }]}>{item.route.userId?.fullName || 'Anonymous Driver'}</Text>
                        <Text style={[styles.carInfo, { color: theme.icon }]}>Price: ${item.route.price}{item.route.priceType === 'km' ? '/km' : ''}</Text>
                    </View>
                </View>

                <View style={styles.routeDetails}>
                    <View style={styles.routeLine}>
                        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                        <View style={[styles.line, { backgroundColor: theme.border }]} />
                        <View style={[styles.sq, { borderColor: theme.text }]} />
                    </View>
                    <View style={styles.addresses}>
                        <Text style={[styles.addrText, { color: theme.text }]} numberOfLines={1}>{item.route.startPoint.address}</Text>
                        <Text style={[styles.addrText, { color: theme.text }]} numberOfLines={1}>{item.route.endPoint.address}</Text>
                    </View>
                </View>

                {item.trip ? (
                    <TouchableOpacity
                        style={[styles.joinBtn, { backgroundColor: theme.primary }]}
                        onPress={() => handleJoin(item.trip.id)}
                    >
                        <Send size={18} color="#fff" />
                        <Text style={styles.joinBtnText}>Request to Join</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={[styles.infoBanner, { backgroundColor: theme.border }]}>
                        <Info size={16} color={theme.icon} />
                        <Text style={[styles.infoText, { color: theme.icon }]}>Check back later, no active trip.</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Proposed Drivers</Text>
                <View style={{ width: 44 }} />
            </View>

            {isLoading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={matches}
                    keyExtractor={(item) => item.route.id}
                    renderItem={renderMatchItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MapPin size={48} color={theme.icon} />
                            <Text style={[styles.emptyText, { color: theme.text }]}>No matching drivers found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '800' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 24, gap: 20 },
    matchCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 16 },
    driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    driverName: { fontSize: 16, fontWeight: '700' },
    carInfo: { fontSize: 13 },
    routeDetails: { flexDirection: 'row', gap: 12 },
    routeLine: { alignItems: 'center', paddingVertical: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    line: { width: 2, height: 20, marginVertical: 2 },
    sq: { width: 10, height: 10, borderWidth: 2, borderRadius: 2 },
    addresses: { flex: 1, height: 44, justifyContent: 'space-between' },
    addrText: { fontSize: 14, fontWeight: '600' },
    joinBtn: { height: 50, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    infoBanner: { height: 50, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 14, fontWeight: '600' },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '600' }
});
