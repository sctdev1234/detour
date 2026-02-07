import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Clock, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { Colors } from '../../constants/theme';
import { useTripStore } from '../../store/useTripStore';
import { useUIStore } from '../../store/useUIStore';

export default function RequestRideScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { createRequest, isLoading } = useTripStore();
    const { showToast } = useUIStore();

    const [pickup, setPickup] = useState('');
    const [destination, setDestination] = useState('');
    const [time, setTime] = useState('08:00');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const toggleDay = (day: string) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const handleSubmit = async () => {
        if (!pickup || !destination || !time || selectedDays.length === 0) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        // Mock coordinates for V1 - in real app would use Google Places Autocomplete
        const mockPickupCoords = { lat: 34.020882, lng: -6.841650, address: pickup };
        const mockDestCoords = { lat: 33.573110, lng: -7.589843, address: destination };

        try {
            await createRequest({
                pickup: mockPickupCoords,
                destination: mockDestCoords,
                schedule: { days: selectedDays, time }
            });
            showToast('Request created successfully!', 'success');
            // Navigate to finding match screen or home
            router.back();
        } catch (error: any) {
            showToast(error.message || 'Failed to create request', 'error');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surface }]}>
                    <ArrowLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Request a Ride</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={[styles.sectionLabel, { color: theme.icon }]}>ROUTE</Text>

                    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.inputRow}>
                            <MapPin size={20} color={theme.primary} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Pickup Location"
                                placeholderTextColor={theme.icon}
                                value={pickup}
                                onChangeText={setPickup}
                            />
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <View style={styles.inputRow}>
                            <MapPin size={20} color={theme.secondary} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Destination"
                                placeholderTextColor={theme.icon}
                                value={destination}
                                onChangeText={setDestination}
                            />
                        </View>
                    </View>

                    <Text style={[styles.sectionLabel, { color: theme.icon, marginTop: 32 }]}>SCHEDULE</Text>

                    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.inputRow}>
                            <Clock size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Time (e.g. 08:30)"
                                placeholderTextColor={theme.icon}
                                value={time}
                                onChangeText={setTime}
                            />
                        </View>
                    </View>

                    <Text style={[styles.label, { color: theme.text, marginTop: 24, marginBottom: 12 }]}>Days of the week</Text>
                    <View style={styles.daysContainer}>
                        {daysOfWeek.map((day) => {
                            const isSelected = selectedDays.includes(day);
                            return (
                                <TouchableOpacity
                                    key={day}
                                    onPress={() => toggleDay(day)}
                                    style={[
                                        styles.dayChip,
                                        {
                                            backgroundColor: isSelected ? theme.primary : theme.surface,
                                            borderColor: isSelected ? theme.primary : theme.border
                                        }
                                    ]}
                                >
                                    <Text style={[styles.dayText, { color: isSelected ? '#fff' : theme.text }]}>{day}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 }]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Check size={20} color="#fff" />
                                <Text style={styles.submitButtonText}>Create Request</Text>
                            </>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 24,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 1,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginLeft: 48,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 32,
    },
    dayChip: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '700',
    },
    submitButton: {
        flexDirection: 'row',
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.15)',
        elevation: 6,
        marginTop: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    }
});
