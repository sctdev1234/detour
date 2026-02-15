import { useUIStore } from '@/store/useUIStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search, Send, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useMatches, useSendJoinRequest, useTrips } from '../../hooks/api/useTripQueries';

export default function DriverFindClientsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const router = useRouter();
    const params = useLocalSearchParams();

    // We need the tripId or routeId to find matches.
    // If coming from a specific trip, we use that.
    // Otherwise we might need to select a trip.
    // For now, let's assume valid routeId is passed or we pick the first active trip's routeId.

    const { data: trips } = useTrips();
    const [activeRouteId, setActiveRouteId] = useState<string | null>(params.routeId as string || null);
    const [activeTripId, setActiveTripId] = useState<string | null>(params.tripId as string || null);

    useEffect(() => {
        if (!activeRouteId && trips?.length) {
            // Default to first pending/active trip
            const trip = trips.find(t => t.status === 'pending' || t.status === 'active');
            if (trip) {
                setActiveRouteId(trip.routeId.id);
                setActiveTripId(trip.id);
            }
        }
    }, [trips, activeRouteId]);

    const { data: matches, isLoading } = useMatches(activeRouteId);
    const { mutateAsync: sendRequest } = useSendJoinRequest();
    const { showToast } = useUIStore();

    const handleSendRequest = async (clientRouteId: string, proposedPrice: number) => {
        if (!activeTripId) return;
        try {
            await sendRequest({
                clientRouteId,
                tripId: activeTripId,
                // @ts-ignore
                proposedPrice // Passing proposed price (currently same as client's proposal, or could be editable)
            });
            showToast('Invitation sent!', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.msg || 'Failed to send invite', 'error');
        }
    };

    const renderClientItem = ({ item, index }: { item: any, index: number }) => {
        const client = item.route.userId;
        const isRequested = item.requestStatus === 'pending' || item.requestStatus === 'accepted';

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={[styles.card, { backgroundColor: theme.surface }]}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        {client?.photoURL ? (
                            <Image source={{ uri: client.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                                <User size={20} color={theme.icon} />
                            </View>
                        )}
                        <View>
                            <Text style={[styles.userName, { color: theme.text }]}>{client?.fullName || 'Client'}</Text>
                            <Text style={[styles.price, { color: theme.primary }]}>
                                Budget: {item.route.price} MAD
                            </Text>
                        </View>
                    </View>
                    <View style={styles.distanceBadge}>
                        <Text style={[styles.distanceText, { color: theme.text }]}>{item.route.distanceKm} km</Text>
                    </View>
                </View>

                <View style={styles.routeInfo}>
                    <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>
                        From: {item.route.startPoint.address}
                    </Text>
                    <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>
                        To: {item.route.endPoint.address}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        { backgroundColor: isRequested ? '#ccc' : theme.primary }
                    ]}
                    disabled={isRequested}
                    onPress={() => handleSendRequest(item.route.id, item.route.price)}
                >
                    {isRequested ? (
                        <>
                            <Text style={styles.buttonText}>Invited</Text>
                        </>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                                style={styles.priceInput}
                                placeholder="Price"
                                placeholderTextColor={theme.icon}
                                keyboardType="numeric"
                                defaultValue={item.route.price?.toString()}
                                onChangeText={(text: string) => {
                                    item.proposedPrice = parseFloat(text);
                                }}
                            />
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                                onPress={() => handleSendRequest(item.route.id, item.proposedPrice || item.route.price)}
                            >
                                <Send size={18} color="#fff" />
                                <Text style={styles.buttonText}>Invite</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 60, paddingBottom: 20 }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', left: 24, top: 60, zIndex: 10 }}>
                    <Text style={{ fontSize: 30, color: theme.text }}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Find Clients</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={matches || []}
                    keyExtractor={(item) => item.route.id}
                    renderItem={renderClientItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Search size={48} color={theme.icon} />
                            <Text style={[styles.emptyText, { color: theme.text }]}>No matching clients found nearby.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24 },
    title: { fontSize: 20, fontWeight: '800' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    list: { padding: 24, gap: 16 },
    card: { padding: 16, borderRadius: 20, gap: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    userInfo: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    userName: { fontSize: 16, fontWeight: '700' },
    price: { fontSize: 14, fontWeight: '600' },
    distanceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
    distanceText: { fontSize: 12, fontWeight: '600' },
    routeInfo: { gap: 4, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    routeText: { fontSize: 13, opacity: 0.8 },
    actionButton: { flexDirection: 'row', height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
    priceInput: {
        width: 80,
        height: 48,
        borderRadius: 14,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        fontSize: 14,
        fontWeight: '700',
        elevation: 2
    }
});
