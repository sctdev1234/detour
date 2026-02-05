import { useRouter } from 'expo-router';
import { Clock, Edit2, MapPin, Plus, Trash2 } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useCarStore } from '../../store/useCarStore';
import { Trip, useTripStore } from '../../store/useTripStore';

export default function RoutesScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { trips, removeTrip } = useTripStore();
    const cars = useCarStore((state) => state.cars);

    const renderTripItem = ({ item }: { item: Trip }) => {
        const car = cars.find(c => c.id === item.carId);

        return (
            <View style={[styles.tripCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Header: Times & Actions */}
                <View style={styles.tripHeader}>
                    <View style={styles.timeContainer}>
                        <View style={[styles.timeBox, { backgroundColor: theme.primary + '15' }]}>
                            <Clock size={14} color={theme.primary} />
                            <Text style={[styles.timeText, { color: theme.primary }]}>{item.timeStart}</Text>
                        </View>
                        <View style={[styles.lineSpacer, { backgroundColor: theme.border }]} />
                        <View style={[styles.timeBox, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
                            <Text style={[styles.timeText, { color: theme.text }]}>{item.timeArrival}</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.actionBtn}>
                            <Edit2 size={18} color={theme.icon} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => removeTrip(item.id)}>
                            <Trash2 size={18} color={theme.accent} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Route Visual */}
                <View style={styles.routeContainer}>
                    <View style={styles.timeline}>
                        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                        <View style={[styles.dashedLine, { borderColor: theme.border }]} />
                        <View style={[styles.square, { borderColor: theme.text }]} />
                    </View>
                    <View style={styles.locations}>
                        <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                            Start Point
                        </Text>
                        <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                            End Point
                        </Text>
                    </View>
                </View>

                {/* Footer: Car & Days */}
                <View style={[styles.footer, { borderTopColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <View style={[styles.carBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Text style={[styles.carText, { color: theme.text }]}>{car ? car.model : 'No Car'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                            {item.days.map(day => (
                                <View key={day} style={[styles.dayDot, { backgroundColor: theme.icon }]} />
                            ))}
                        </View>
                    </View>
                    <Text style={[styles.priceText, { color: theme.primary }]}>
                        ${item.price}{item.priceType === 'km' ? '/km' : ''}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surface }]}>
                    <MapPin size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>My Routes</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={() => router.push('/(driver)/add-trip')}
                >
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={trips}
                keyExtractor={(item) => item.id}
                renderItem={renderTripItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIcon, { backgroundColor: theme.surface }]}>
                            <MapPin size={32} color={theme.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Routes Yet</Text>
                        <Text style={[styles.emptyText, { color: theme.icon }]}>Create a recurring route to start getting requests.</Text>
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
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    },
    listContent: {
        padding: 20,
        gap: 20,
    },
    tripCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 20,
        gap: 20,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    timeText: {
        fontWeight: '700',
        fontSize: 13,
    },
    lineSpacer: {
        width: 12,
        height: 1,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        padding: 8,
    },
    routeContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    timeline: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    dashedLine: {
        width: 1,
        height: 24,
        marginVertical: 4,
        borderWidth: 0.5,
        borderStyle: 'dashed',
    },
    square: {
        width: 10,
        height: 10,
        borderWidth: 2,
    },
    locations: {
        justifyContent: 'space-between',
        flex: 1,
        height: 50, // Match timeline height roughly
    },
    locationText: {
        fontSize: 15,
        fontWeight: '600',
    },
    footer: {
        borderTopWidth: 1,
        paddingTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    carBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    carText: {
        fontSize: 12,
        fontWeight: '600',
    },
    dayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    priceText: {
        fontSize: 16,
        fontWeight: '800',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        gap: 12,
        padding: 40,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
});
