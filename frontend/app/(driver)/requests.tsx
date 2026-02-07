import { useRouter } from 'expo-router';
import { Check, ChevronLeft, User, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTripStore } from '../../store/useTripStore';

export default function DriverRequestsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { driverRequests, fetchDriverRequests, handleJoinRequest, isLoading } = useTripStore();

    useEffect(() => {
        fetchDriverRequests();
    }, []);

    const onRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
        try {
            await handleJoinRequest(requestId, status);
            alert(`Request ${status}`);
        } catch (error) {
            console.error(error);
            alert('Failed to respond');
        }
    };

    const renderRequestItem = ({ item }: { item: any }) => {
        return (
            <View style={[styles.reqCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.clientInfo}>
                    {item.clientId?.photoURL ? (
                        <Image source={{ uri: item.clientId.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
                            <User size={24} color={theme.icon} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.clientName, { color: theme.text }]}>{item.clientId?.fullName}</Text>
                        <Text style={[styles.routeInfo, { color: theme.icon }]}>Trajet Matching: {item.clientRouteId?.startPoint?.address.split(',')[0]} → {item.clientRouteId?.endPoint?.address.split(',')[0]}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.accent + '20' }]}
                        onPress={() => onRespond(item.id, 'rejected')}
                    >
                        <X size={20} color={theme.accent} />
                        <Text style={[styles.btnText, { color: theme.accent }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.primary + '20' }]}
                        onPress={() => onRespond(item.id, 'accepted')}
                    >
                        <Check size={20} color={theme.primary} />
                        <Text style={[styles.btnText, { color: theme.primary }]}>Accept</Text>
                    </TouchableOpacity>
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
                <Text style={[styles.title, { color: theme.text }]}>Join Requests</Text>
                <View style={{ width: 44 }} />
            </View>

            {isLoading && !driverRequests.length ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={driverRequests}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRequestItem}
                    contentContainerStyle={styles.list}
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
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '800' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 24, gap: 16 },
    reqCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 16 },
    clientInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    clientName: { fontSize: 16, fontWeight: '700' },
    routeInfo: { fontSize: 12 },
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    btnText: { fontWeight: '700', fontSize: 14 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '600' }
});
