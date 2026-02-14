import { useRouter } from 'expo-router';
import { Clock, MapPin, Plus, Search, Trash2 } from 'lucide-react-native';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../constants/theme';
import { useRemoveRoute, useRoutes } from '../hooks/api/useTripQueries';
import { useAuthStore } from '../store/useAuthStore';
import { Route } from '../types';



export default function RoutesScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { data: routes, isLoading, refetch } = useRoutes();
    const { mutateAsync: removeRoute } = useRemoveRoute();
    const user = useAuthStore((state: any) => state.user);

    const handleDelete = async (id: string) => {
        try {
            await removeRoute(id);
        } catch (error) {
            console.error('Failed to delete route', error);
        }
    };

    const renderRouteItem = ({ item, index }: { item: Route, index: number }) => {
        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={[styles.routeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
                <View style={styles.routeHeader}>
                    <View style={styles.timeContainer}>
                        <View style={[styles.timeBox, { backgroundColor: theme.primary + '15' }]}>
                            <Clock size={14} color={theme.primary} />
                            <Text style={[styles.timeText, { color: theme.primary }]}>{item.timeStart}</Text>
                        </View>
                        {item.role === 'driver' && item.timeArrival && (
                            <>
                                <View style={[styles.lineSpacer, { backgroundColor: theme.border }]} />
                                <View style={[styles.timeBox, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
                                    <Text style={[styles.timeText, { color: theme.text }]}>{item.timeArrival}</Text>
                                </View>
                            </>
                        )}
                    </View>

                    <View style={styles.actions}>
                        {item.role === 'client' && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.primary + '10' }]}
                                onPress={() => router.push({ pathname: '/(client)/find-matches', params: { routeId: item.id } })}
                            >
                                <Search size={18} color={theme.primary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                            <Trash2 size={18} color={'#ef4444'} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.trajectory}>
                    <View style={styles.timeline}>
                        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                        <View style={[styles.dashedLine, { borderColor: theme.border }]} />
                        <View style={[styles.square, { borderColor: theme.text }]} />
                    </View>
                    <View style={styles.locations}>
                        <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                            {item.startPoint.address}
                        </Text>
                        <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                            {item.endPoint.address}
                        </Text>
                    </View>
                </View>

                <View style={[styles.footer, { borderTopWidth: 1, paddingTop: 12, marginTop: 8, borderTopColor: theme.border }]}>
                    <View style={styles.daysRow}>
                        {item.days.map((day: string) => (
                            <View key={day} style={[styles.dayBadge, { backgroundColor: theme.primary + '20' }]}>
                                <Text style={[styles.dayText, { color: theme.primary }]}>{day}</Text>
                            </View>
                        ))}
                    </View>
                    {item.role === 'driver' && (
                        <Text style={[styles.priceText, { color: theme.primary }]}>
                            ${item.price}{item.priceType === 'km' ? '/km' : ''}
                        </Text>
                    )}
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: 'transparent', paddingTop: 80, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text }]}>My Routes</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push(user?.role === 'driver' ? '/(driver)/add-route' : '/(client)/add-route')}
                >
                    <Plus size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {isLoading && !routes?.length ? (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={routes || []}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => renderRouteItem({ item, index })}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MapPin size={48} color={theme.icon} />
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Routes Yet</Text>
                            <Text style={[styles.emptyText, { color: theme.icon }]}>Create a recurring trajectory to start.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        elevation: 4,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
    },
    listContent: {
        padding: 24,
        gap: 20,
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
        maxWidth: '80%',
        lineHeight: 24,
    },
    routeCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 20,
        elevation: 2,
        boxShadow: '0px 4px 20px rgba(0,0,0,0.05)',
    },
    routeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeBox: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    lineSpacer: {
        width: 16,
        height: 2,
        marginHorizontal: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    trajectory: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    timeline: {
        alignItems: 'center',
        paddingTop: 4,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    dashedLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderRadius: 1,
    },
    square: {
        width: 12,
        height: 12,
        borderWidth: 2,
        borderRadius: 3,
    },
    locations: {
        flex: 1,
        justifyContent: 'space-between',
        height: 60,
    },
    locationText: {
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    daysRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    dayBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    dayText: {
        fontSize: 12,
        fontWeight: '700',
    },
    priceText: {
        fontSize: 18,
        fontWeight: '800',
    },
});
