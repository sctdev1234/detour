import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Clock, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useClientRequestStore } from '../../store/useClientRequestStore';
import { useUIStore } from '../../store/useUIStore';

export default function RequestRideScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { addRequest } = useClientRequestStore();
    const { showToast } = useUIStore();
    const [isLoading, setIsLoading] = useState(false);

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

        setIsLoading(true);

        // Mock coordinates for V1 - in real app would use Google Places Autocomplete
        const mockPickupCoords = { latitude: 34.020882, longitude: -6.841650, address: pickup };
        const mockDestCoords = { latitude: 33.573110, longitude: -7.589843, address: destination };

        try {
            addRequest({
                startPoint: mockPickupCoords,
                endPoint: mockDestCoords,
                preferredTime: time,
                days: selectedDays,
                proposedPrice: 0, // Default or prompt user
            });
            showToast('Request created successfully!', 'success');
            // Navigate to finding match screen or home
            router.back();
        } catch (error: any) {
            showToast(error.message || 'Failed to create request', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={[theme.primary, theme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: '#fff' }]}>Request a Ride</Text>
                <View style={{ width: 44 }} />
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.sectionLabel, { color: theme.icon }]}>ROUTE</Text>

                    <PremiumInput
                        label="Pickup Location"
                        value={pickup}
                        onChangeText={setPickup}
                        placeholder="e.g. Home"
                        icon={MapPin}
                    />

                    <PremiumInput
                        label="Destination"
                        value={destination}
                        onChangeText={setDestination}
                        placeholder="e.g. Office"
                        icon={MapPin}
                    />

                    <Text style={[styles.sectionLabel, { color: theme.icon, marginTop: 24 }]}>SCHEDULE</Text>

                    <PremiumInput
                        label="Departure Time"
                        value={time}
                        onChangeText={setTime}
                        placeholder="08:00"
                        icon={Clock}
                    />

                    <Text style={[styles.label, { color: theme.text, marginTop: 16, marginBottom: 12 }]}>Days of the week</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    content: {
        padding: 24,
        gap: 8,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 1,
        marginTop: 8,
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
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0px 8px 20px rgba(0,0,0,0.2)',
        elevation: 6,
        marginTop: 20,
        marginBottom: 40,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    }
});
