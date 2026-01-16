import { useRouter } from 'expo-router';
import { Clock, MapPin, Plus, Trash2 } from 'lucide-react-native';
import React from 'react';
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
                <View style={styles.tripHeader}>
                    <View style={styles.timeTag}>
                        <Clock size={14} color={theme.primary} />
                        <Text style={[styles.timeText, { color: theme.primary }]}>{item.timeStart} - {item.timeArrival}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeTrip(item.id)}>
                        <Trash2 size={18} color={theme.accent} />
                    </TouchableOpacity>
                </View>

                <View style={styles.routeContainer}>
                    <View style={styles.dotContainer}>
                        <View style={[styles.dot, { backgroundColor: '#4CD964' }]} />
                        <View style={[styles.line, { backgroundColor: theme.border }]} />
                        <View style={[styles.dot, { backgroundColor: '#FF3B30' }]} />
                    </View>
                    <View style={styles.routeNames}>
                        <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>Start Point</Text>
                        <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>End Point</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.daysList}>
                        {item.days.map(day => (
                            <Text key={day} style={[styles.dayShort, { color: theme.icon }]}>{day.substring(0, 1)}</Text>
                        ))}
                    </View>
                    <View style={styles.priceContainer}>
                        <Text style={[styles.priceText, { color: theme.primary }]}>
                            {item.priceType === 'fix' ? `$${item.price}` : `$${item.price}/km`}
                        </Text>
                    </View>
                </View>

                {car && (
                    <View style={styles.carTag}>
                        <Text style={[styles.carText, { color: theme.icon }]}>{car.marque} {car.model}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>My Trajets</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={() => router.push('/(driver)/add-trip')}
                >
                    <Plus size={20} color="#fff" />
                    <Text style={styles.addButtonText}>New Trip</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={trips}
                keyExtractor={(item) => item.id}
                renderItem={renderTripItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MapPin size={64} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>No trips configured yet</Text>
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
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 4,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    listContent: {
        padding: 24,
        gap: 16,
    },
    tripCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        gap: 16,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    routeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    dotContainer: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    line: {
        width: 2,
        flex: 1,
        marginVertical: 4,
    },
    routeNames: {
        flex: 1,
        justifyContent: 'space-between',
    },
    routeText: {
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    daysList: {
        flexDirection: 'row',
        gap: 8,
    },
    dayShort: {
        fontSize: 12,
        fontWeight: '700',
    },
    priceContainer: {
        backgroundColor: '#0066FF10',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    priceText: {
        fontSize: 16,
        fontWeight: '700',
    },
    carTag: {
        marginTop: -8,
    },
    carText: {
        fontSize: 12,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
    },
});
