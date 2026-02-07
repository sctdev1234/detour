import { useRouter } from 'expo-router';
import { ChevronLeft, Send, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTripStore } from '../../store/useTripStore';

export default function ClientRequestsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { clientRequests, fetchClientRequests, isLoading } = useTripStore();

    useEffect(() => {
        fetchClientRequests();
    }, []);

    const renderRequestItem = ({ item }: { item: any }) => {
        const driver = item.tripId?.driverId;
        return (
            <View style={[styles.reqCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.driverInfo}>
                    {driver?.photoURL ? (
                        <Image source={{ uri: driver.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
                            <User size={24} color={theme.icon} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.driverName, { color: theme.text }]}>{driver?.fullName || 'Anonymous Driver'}</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: item.status === 'pending' ? '#f59e0b' : item.status === 'accepted' ? '#10b981' : '#ef4444' }]} />
                            <Text style={[styles.statusText, { color: theme.icon }]}>{item.status.toUpperCase()}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>My Requests</Text>
                <View style={{ width: 44 }} />
            </View>

            {isLoading && !clientRequests.length ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={clientRequests}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRequestItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Send size={48} color={theme.icon} />
                            <Text style={[styles.emptyText, { color: theme.text }]}>No requests sent yet</Text>
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
    list: { padding: 24, gap: 16 },
    reqCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
    driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    driverName: { fontSize: 16, fontWeight: '700' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '600' }
});
