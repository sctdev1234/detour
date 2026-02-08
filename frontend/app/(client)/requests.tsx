import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Send, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

    const renderRequestItem = ({ item, index }: { item: any, index: number }) => {
        const driver = item.tripId?.driverId;
        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={styles.reqCardWrapper}
            >
                <BlurView intensity={20} tint="light" style={styles.reqCard}>
                    <View style={styles.driverInfo}>
                        {driver?.photoURL ? (
                            <Image source={{ uri: driver.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
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
                </BlurView>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 80, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>My Requests</Text>
            </View>

            {isLoading && !clientRequests.length ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={clientRequests}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => renderRequestItem({ item, index })}
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
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    title: { fontSize: 20, fontWeight: '800' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 24, gap: 16 },
    reqCardWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    reqCard: {
        padding: 16,
        gap: 12
    },
    driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    driverName: { fontSize: 16, fontWeight: '700' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '600' }
});
