import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import MapPicker from '../../components/MapPicker';
import { useTripStore, LatLng } from '../../store/useTripStore';
import { useCarStore } from '../../store/useCarStore';
import { ChevronLeft, Clock, Calendar, DollarSign, Car } from 'lucide-react-native';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AddTripScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const addTrip = useTripStore((state) => state.addTrip);
    const cars = useCarStore((state) => state.cars);

    const [points, setPoints] = useState<LatLng[]>([]);
    const [timeStart, setTimeStart] = useState('08:00');
    const [timeArrival, setTimeArrival] = useState('09:00');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [price, setPrice] = useState('50');
    const [priceType, setPriceType] = useState<'fix' | 'km'>('fix');
    const [selectedCarId, setSelectedCarId] = useState(cars.find(c => c.isDefault)?.id || cars[0]?.id || '');

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSave = () => {
        if (points.length < 2) {
            Alert.alert('Error', 'Please select at least start and end points on the map');
            return;
        }
        if (!selectedCarId) {
            Alert.alert('Error', 'Please select a car for this trip');
            return;
        }
        if (selectedDays.length === 0) {
            Alert.alert('Error', 'Please select at least one day for this recurring trip');
            return;
        }

        addTrip({
            carId: selectedCarId,
            startPoint: points[0],
            endPoint: points[points.length - 1],
            waypoints: points.slice(1, -1),
            timeStart,
            timeArrival,
            days: selectedDays,
            price: parseFloat(price) || 0,
            priceType,
            status: 'active',
        });

        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Configure Trajet</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Define Route</Text>
                    <MapPicker onPointsChange={setPoints} theme={theme} />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Schedule</Text>
                    <View style={styles.row}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.icon }]}>Start Time</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                value={timeStart}
                                onChangeText={setTimeStart}
                                placeholder="08:00"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.icon }]}>Arrival Time</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                value={timeArrival}
                                onChangeText={setTimeArrival}
                                placeholder="09:00"
                            />
                        </View>
                    </View>

                    <Text style={[styles.label, { color: theme.icon, marginTop: 12 }]}>Recurring Days</Text>
                    <View style={styles.daysContainer}>
                        {DAYS.map(day => (
                            <TouchableOpacity
                                key={day}
                                style={[
                                    styles.dayBadge,
                                    { backgroundColor: selectedDays.includes(day) ? theme.primary : theme.surface, borderColor: theme.border }
                                ]}
                                onPress={() => toggleDay(day)}
                            >
                                <Text style={[styles.dayText, { color: selectedDays.includes(day) ? '#fff' : theme.text }]}>
                                    {day.substring(0, 3)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Car & Pricing</Text>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.icon }]}>Select Car</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carsScroll}>
                            {cars.map(car => (
                                <TouchableOpacity
                                    key={car.id}
                                    style={[
                                        styles.carCard,
                                        { backgroundColor: theme.surface, borderColor: selectedCarId === car.id ? theme.primary : theme.border }
                                    ]}
                                    onPress={() => setSelectedCarId(car.id)}
                                >
                                    <Car size={20} color={selectedCarId === car.id ? theme.primary : theme.icon} />
                                    <Text style={[styles.carName, { color: theme.text }]}>{car.marque} {car.model}</Text>
                                </TouchableOpacity>
                            ))}
                            {cars.length === 0 && (
                                <TouchableOpacity onPress={() => router.push('/(driver)/add-car')}>
                                    <Text style={{ color: theme.primary }}>+ Add a car first</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>

                    <View style={[styles.row, { marginTop: 12 }]}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.label, { color: theme.icon }]}>Price</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                keyboardType="numeric"
                                value={price}
                                onChangeText={setPrice}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.label, { color: theme.icon }]}>Type</Text>
                            <View style={styles.priceTypeContainer}>
                                <TouchableOpacity
                                    style={[styles.typeButton, { backgroundColor: priceType === 'fix' ? theme.primary : theme.surface, borderColor: theme.border }]}
                                    onPress={() => setPriceType('fix')}
                                >
                                    <Text style={[styles.typeText, { color: priceType === 'fix' ? '#fff' : theme.text }]}>Fixed</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeButton, { backgroundColor: priceType === 'km' ? theme.primary : theme.surface, borderColor: theme.border }]}
                                    onPress={() => setPriceType('km')}
                                >
                                    <Text style={[styles.typeText, { color: priceType === 'km' ? '#fff' : theme.text }]}>Per KM</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.primary }]}
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Create Trajet</Text>
                </TouchableOpacity>
            </ScrollView>
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
        paddingTop: 32,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        padding: 24,
        gap: 32,
    },
    section: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    inputGroup: {
        flex: 1,
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    input: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    dayText: {
        fontSize: 12,
        fontWeight: '600',
    },
    carsScroll: {
        gap: 12,
        paddingVertical: 4,
    },
    carCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    carName: {
        fontSize: 14,
        fontWeight: '600',
    },
    priceTypeContainer: {
        flexDirection: 'row',
        height: 48,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    typeButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    saveButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 24,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
