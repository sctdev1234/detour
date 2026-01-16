import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useCarStore, Car } from '../../store/useCarStore';
import { Car as CarIcon, Plus, CheckCircle2, ChevronRight, Trash2 } from 'lucide-react-native';

export default function CarsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { cars, removeCar, setDefaultCar } = useCarStore();

    const renderCarItem = ({ item }: { item: Car }) => (
        <View style={[styles.carCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.carIconContainer, { backgroundColor: item.isDefault ? theme.primary + '20' : theme.border + '20' }]}>
                <CarIcon size={24} color={item.isDefault ? theme.primary : theme.icon} />
            </View>

            <View style={styles.carInfo}>
                <View style={styles.carHeader}>
                    <Text style={[styles.carName, { color: theme.text }]}>{item.marque} {item.model}</Text>
                    {item.isDefault && (
                        <View style={[styles.defaultBadge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.defaultText}>Default</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.carDetails, { color: theme.icon }]}>
                    {item.year} • {item.color} • {item.places} seats
                </Text>
            </View>

            <View style={styles.actions}>
                {!item.isDefault && (
                    <TouchableOpacity onPress={() => setDefaultCar(item.id)} style={styles.actionIcon}>
                        <CheckCircle2 size={20} color={theme.icon} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => removeCar(item.id)} style={styles.actionIcon}>
                    <Trash2 size={20} color={theme.accent} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>My Cars</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={() => router.push('/(driver)/add-car')}
                >
                    <Plus size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Add Car</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={cars}
                keyExtractor={(item) => item.id}
                renderItem={renderCarItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <CarIcon size={64} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>No cars added yet</Text>
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
    carCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    carIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    carInfo: {
        flex: 1,
    },
    carHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    carName: {
        fontSize: 18,
        fontWeight: '600',
    },
    defaultBadge: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    defaultText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    carDetails: {
        fontSize: 14,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionIcon: {
        padding: 8,
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
