import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Send, User } from 'lucide-react-native';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useClientRequests, useHandleJoinRequest } from '../../hooks/api/useTripQueries';

export default function ClientRequestsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { data: clientRequests, isLoading } = useClientRequests();

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
                            <Image source={{ uri: driver.photoURL }} style={styles.avatar} contentFit="cover" transition={500} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
                                <User size={24} color={theme.icon} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.driverName, { color: theme.text }]}>{driver?.fullName || 'Anonymous Driver'}</Text>
                            <View style={styles.statusRow}>
                                <Text style={[styles.statusText, { color: theme.icon }]}>
                                    Status: {item.status.toUpperCase()}
                                </Text>
                            </View>
                            {item.proposedPrice && (
                                <Text style={{ color: theme.primary, fontWeight: '700', marginTop: 4 }}>
                                    Offer: {item.proposedPrice} MAD
                                </Text>
                            )}
                        </View>
                    </View>

                    {item.status === 'pending' && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                                onPress={() => handleRequest(item._id, 'rejected')}
                            >
                                <Text style={styles.btnText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                                onPress={() => handleRequest(item._id, 'accepted')}
                            >
                                <Text style={styles.btnText}>Accept</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </BlurView>
            </Animated.View>
        );
    };

    const { mutateAsync: handleJoinRequest } = useHandleJoinRequest();

    const handleRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
        try {
            await handleJoinRequest({ requestId, status });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 80, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>My Requests</Text>
            </View>

            {isLoading && (!clientRequests || clientRequests.length === 0) ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={clientRequests || []}
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
    emptyText: { fontSize: 16, fontWeight: '600' },
    actionButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});
