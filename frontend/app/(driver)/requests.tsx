import { useUIStore } from '@/store/useUIStore';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Check, User, X } from 'lucide-react-native';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useDriverRequests, useHandleJoinRequest } from '../../hooks/api/useTripQueries';

export default function DriverRequestsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { data: driverRequests, isLoading } = useDriverRequests();
    const { mutateAsync: handleJoinRequest } = useHandleJoinRequest();
    const { showToast } = useUIStore();

    const onRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
        try {
            await handleJoinRequest({ requestId, status });
            showToast(`Request ${status}`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to respond', 'error');
        }
    };

    const renderRequestItem = ({ item, index }: { item: any, index: number }) => {
        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={[styles.reqCardWrapper]}
            >
                <BlurView intensity={20} tint="light" style={styles.reqCard}>
                    <View style={styles.clientInfo}>
                        {item.clientId?.photoURL ? (
                            <Image source={{ uri: item.clientId.photoURL }} style={styles.avatar} contentFit="cover" transition={500} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
                                <User size={24} color={theme.icon} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.clientName, { color: theme.text }]}>{item.clientId?.fullName}</Text>
                            <Text style={[styles.routeInfo, { color: theme.icon }]}>
                                {item.clientRouteId?.startPoint?.address?.split(',')[0] || 'Start'} → {item.clientRouteId?.endPoint?.address?.split(',')[0] || 'End'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}
                            onPress={() => onRespond(item.id, 'rejected')}
                        >
                            <X size={20} color="#ef4444" />
                            <Text style={[styles.btnText, { color: '#ef4444' }]}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10b98120' }]}
                            onPress={() => onRespond(item.id, 'accepted')}
                        >
                            <Check size={20} color="#10b981" />
                            <Text style={[styles.btnText, { color: '#10b981' }]}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <X size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Requests</Text>
                <View style={{ width: 44 }} />
            </View>

            {isLoading && !driverRequests?.length ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={driverRequests || []}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => renderRequestItem({ item, index })}
                    contentContainerStyle={[styles.list]}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <User size={48} color={theme.icon} />
                            <Text style={[styles.emptyText, { color: theme.text }]}>No pending requests</Text>
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
        paddingTop: 60,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(120,120,120,0.1)'
    },
    title: { fontSize: 20, fontWeight: '800' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 24, gap: 16 },
    reqCardWrapper: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(255,255,255,0.5)',
        marginBottom: 16,
    },
    reqCard: {
        padding: 20,
        gap: 16
    },
    clientInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    clientName: { fontSize: 16, fontWeight: '700' },
    routeInfo: { fontSize: 12, opacity: 0.7 },
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    btnText: { fontWeight: '700', fontSize: 14 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '600' }
});
