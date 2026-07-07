import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRecurringStore } from '../../stores/useRecurringStore';
import { TripTemplate } from '../../services/recurringApi';

export const DriverRecurringScreen: React.FC = () => {
    const { templates, fetchTemplates, isLoading, error } = useRecurringStore();

    useEffect(() => {
        // Fetch only driver templates or filter client-side
        fetchTemplates();
    }, []);

    const driverTemplates = templates.filter(t => t.creatorRole === 'driver');

    const renderItem = ({ item }: { item: TripTemplate }) => (
        <View style={styles.card}>
            <Text style={styles.title}>Route: {item.startPoint?.address || 'Pickup'} to {item.endPoint?.address || 'Dropoff'}</Text>
            <Text>Departure: {item.recurringConfig.departureTime}</Text>
            <Text>Days: {item.recurringConfig.days.join(', ')}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Linked Passengers: {item.linkedTemplates.length}</Text>
        </View>
    );

    if (isLoading) return <ActivityIndicator size="large" />;
    if (error) return <Text style={styles.error}>Error: {error}</Text>;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>My Driving Routes</Text>
            <FlatList
                data={driverTemplates}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                ListEmptyComponent={<Text>No driving routes found.</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    card: { padding: 16, backgroundColor: '#fff', borderRadius: 8, marginBottom: 12, elevation: 2 },
    title: { fontSize: 18, fontWeight: '600' },
    error: { color: 'red' }
});
