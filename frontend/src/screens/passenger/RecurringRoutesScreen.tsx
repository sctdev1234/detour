import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRecurringStore } from '../../stores/useRecurringStore';
import { TripTemplate } from '../../services/recurringApi';

export const RecurringRoutesScreen: React.FC = () => {
    const { templates, fetchTemplates, isLoading, error } = useRecurringStore();

    useEffect(() => {
        fetchTemplates();
    }, []);

    const renderItem = ({ item }: { item: TripTemplate }) => (
        <View style={styles.card}>
            <Text style={styles.title}>{item.schedulingStrategy} - {item.creatorRole}</Text>
            <Text>Departure: {item.recurringConfig.departureTime}</Text>
            <Text>Days: {item.recurringConfig.days.join(', ')}</Text>
            <Text>Status: {item.status}</Text>
        </View>
    );

    if (isLoading) return <ActivityIndicator size="large" />;
    if (error) return <Text style={styles.error}>Error: {error}</Text>;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>My Recurring Routes</Text>
            <FlatList
                data={templates}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                ListEmptyComponent={<Text>No recurring routes found.</Text>}
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
