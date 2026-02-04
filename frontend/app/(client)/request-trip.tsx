import { useUIStore } from '@/store/useUIStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft, Clock, DollarSign, Info } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useClientRequestStore } from '../../store/useClientRequestStore';
import { useTripStore } from '../../store/useTripStore';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function RequestTripScreen() {
    const router = useRouter();
    const { driverTripId } = useLocalSearchParams<{ driverTripId: string }>();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const driverTrip = useTripStore((state) =>
        state.trips.find(t => t.id === driverTripId)
    );

    const addRequest = useClientRequestStore((state) => state.addRequest);
    const { showToast, showConfirm } = useUIStore();

    const [proposedPrice, setProposedPrice] = useState(driverTrip?.price.toString() || '0');
    const [preferredTime, setPreferredTime] = useState(driverTrip?.timeStart || '08:00');
    const [selectedDays, setSelectedDays] = useState<string[]>(driverTrip?.days || []);

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleRequest = () => {
        if (!driverTrip) return;

        const price = parseFloat(proposedPrice);
        if (isNaN(price) || price <= 0) {
            showToast("Please enter a valid price greater than 0", 'warning');
            return;
        }

        if (selectedDays.length === 0) {
            showToast("Please select at least one day for the recurring trip", 'warning');
            return;
        }

        addRequest({
            driverTripId,
            startPoint: driverTrip.startPoint,
            endPoint: driverTrip.endPoint,
            preferredTime,
            days: selectedDays,
            proposedPrice: price,
        });

        showConfirm(
            'Request Sent',
            'Your request has been sent to the driver!',
            () => router.push('/(client)/trips'),
            undefined,
            'Great!',
            ''
        );
    };

    if (!driverTrip) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.text, marginBottom: 16 }}>Trip details unavailable.</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: theme.primary, fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Request Ride</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.guideCard, { backgroundColor: theme.surface }]}>
                    <View style={styles.guideIcon}>
                        <Info size={24} color={theme.primary} />
                    </View>
                    <Text style={[styles.guideText, { color: theme.text }]}>
                        You are requesting to join this driver's recurring route. Propose a price and schedule that works for you.
                    </Text>
                </View>

                {/* Price Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Proposed Price</Text>
                    <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
                        <DollarSign size={20} color={theme.primary} />
                        <TextInput
                            style={[styles.input, { color: theme.text, fontSize: 24 }]}
                            value={proposedPrice}
                            onChangeText={setProposedPrice}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                        <Text style={{ color: theme.icon, fontSize: 16 }}>
                            {driverTrip.priceType === 'fix' ? 'Flat' : '/km'}
                        </Text>
                    </View>
                    <View style={styles.helperRow}>
                        <Text style={{ color: theme.icon, fontSize: 12 }}>Driver asks: ${driverTrip.price}</Text>
                    </View>
                </View>

                {/* Time Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferred Time</Text>
                    <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Clock size={20} color={theme.icon} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={preferredTime}
                            onChangeText={setPreferredTime}
                            placeholder="08:00"
                            placeholderTextColor={theme.icon}
                        />
                    </View>
                </View>

                {/* Days Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recurring Days</Text>
                    <View style={styles.daysGrid}>
                        {DAYS.map(day => {
                            const isSelected = selectedDays.includes(day);
                            return (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayItem,
                                        {
                                            backgroundColor: isSelected ? theme.primary : theme.surface,
                                            borderColor: isSelected ? theme.primary : theme.border
                                        }
                                    ]}
                                    onPress={() => toggleDay(day)}
                                >
                                    <Text style={[styles.dayText, { color: isSelected ? '#fff' : theme.text }]}>
                                        {day.substring(0, 3)}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary }]}
                    onPress={handleRequest}
                    activeOpacity={0.8}
                >
                    <Text style={styles.submitButtonText}>Send Request</Text>
                    <Check size={20} color="#fff" />
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 24,
        gap: 32,
    },
    guideCard: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 16,
        gap: 16,
        alignItems: 'center',
    },
    guideIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 64,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 20,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
    },
    helperRow: { // Added helper row style
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingRight: 4,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    dayItem: {
        width: '18%', // Approx 5 items per row with gap
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '600',
    },
    submitButton: {
        flexDirection: 'row',
        height: 60,
        borderRadius: 30, // Pill shape
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
