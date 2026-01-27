import { useRouter } from 'expo-router';
import { Car as CarIcon, Plus, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useEffect } from 'react'; // Added import
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore'; // Added import
import { Car, useCarStore } from '../../store/useCarStore';

export default function CarsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { cars, removeCar, setDefaultCar, fetchCars } = useCarStore(); // Added fetchCars
    const user = useAuthStore((state) => state.user); // Get user

    useEffect(() => {
        if (user?.id) {
            fetchCars(user.id);
        }
    }, [user, fetchCars]);

    const renderCarItem = ({ item }: { item: Car }) => (
        <View style={[styles.carCard, { backgroundColor: theme.surface, borderColor: item.isDefault ? theme.primary : theme.border }]}>
            {/* Image / Icon Header */}
            <View style={styles.imageContainer}>
                {item.images && item.images.length > 0 ? (
                    <Image source={{ uri: item.images[0] }} style={styles.carImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: theme.background }]}>
                        <CarIcon size={48} color={theme.icon} />
                    </View>
                )}
                {item.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: theme.primary }]}>
                        <ShieldCheck size={12} color="#fff" />
                        <Text style={styles.defaultText}>Active</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={[styles.carName, { color: theme.text }]}>{item.marque} {item.model}</Text>
                        <Text style={[styles.carDetails, { color: theme.icon }]}>{item.year} • {item.color}</Text>
                    </View>
                    {!item.isDefault && (
                        <TouchableOpacity
                            onPress={() => setDefaultCar(item.id)}
                            style={[styles.activateButton, { borderColor: theme.border }]}
                        >
                            <Text style={[styles.activateText, { color: theme.icon }]}>Select</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.actionsRow}>
                    <View style={styles.spec}>
                        <Text style={[styles.specLabel, { color: theme.icon }]}>Seats</Text>
                        <Text style={[styles.specValue, { color: theme.text }]}>{item.places}</Text>
                    </View>
                    <View style={styles.spec}>
                        <Text style={[styles.specLabel, { color: theme.icon }]}>Driver</Text>
                        {item.assignment?.status === 'active' ? (
                            <Text style={[styles.specValue, { color: theme.primary }]}>Assigned</Text>
                        ) : (
                            <TouchableOpacity onPress={() => router.push({ pathname: '/(driver)/assign-car', params: { carId: item.id } })}>
                                <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>+ Assign</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => removeCar(item.id)} style={styles.deleteBtn}>
                        <Trash2 size={18} color={theme.accent} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surface }]}>
                    <CarIcon size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>My Garage</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={() => router.push('/(driver)/add-car')}
                >
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={cars}
                keyExtractor={(item) => item.id}
                renderItem={renderCarItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIcon, { backgroundColor: theme.surface }]}>
                            <CarIcon size={32} color={theme.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Cars</Text>
                        <Text style={[styles.emptyText, { color: theme.icon }]}>Add a vehicle to enable trip creation.</Text>
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
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    listContent: {
        padding: 20,
        gap: 24,
    },
    carCard: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    imageContainer: {
        height: 150,
        position: 'relative',
    },
    carImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    defaultBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        alignItems: 'center',
        gap: 4,
    },
    defaultText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    cardContent: {
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    carName: {
        fontSize: 18,
        fontWeight: '700',
    },
    carDetails: {
        fontSize: 14,
        marginTop: 2,
    },
    activateButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    activateText: {
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spec: {
        marginRight: 24,
    },
    specLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    specValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    deleteBtn: {
        padding: 8,
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
