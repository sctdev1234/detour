import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useTripStore } from '../../store/useTripStore';
import { useClientRequestStore } from '../../store/useClientRequestStore';
import { ChevronLeft, Info, Calendar, Clock, DollarSign } from 'lucide-react-native';

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

    const [proposedPrice, setProposedPrice] = useState(driverTrip?.price.toString() || '50');
    const [preferredTime, setPreferredTime] = useState(driverTrip?.timeStart || '08:00');
    const [selectedDays, setSelectedDays] = useState<string[]>(driverTrip?.days || []);

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleRequest = () => {
        if (!driverTrip) return;

        addRequest({
            driverTripId,
            startPoint: driverTrip.startPoint,
            endPoint: driverTrip.endPoint,
            preferredTime,
            days: selectedDays,
            proposedPrice: parseFloat(proposedPrice) || 0,
        });

        Alert.alert('Success', 'Your request has been sent to the driver!', [
            { text: 'OK', onPress: () => router.push('/(client)/trips') }
        ]);
    };

    if (!driverTrip) {
        return (
            <View style={styles.errorContainer}>
                <Text>Trip not found</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: theme.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Request Ride</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.infoBanner, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}>
                    <Info size={20} color={theme.primary} />
                    <Text style={[styles.infoText, { color: theme.text }]}>
                        You are requesting to join this driver's recurring route. You can propose your own price and schedule.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Proposed Price</Text>
                    <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <DollarSign size={20} color={theme.icon} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={proposedPrice}
                            onChangeText={setProposedPrice}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                        <Text style={{ color: theme.icon }}>{driverTrip.priceType === 'fix' ? 'Fix' : '/km'}</Text>
                    </View>
                    <Text style={[styles.hint, { color: theme.icon }]}>Driver suggested: ${driverTrip.price}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferred Time</Text>
                    <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Clock size={20} color={theme.icon} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={preferredTime}
                            onChangeText={setPreferredTime}
                            placeholder="08:00"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recurring Days</Text>
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

                <TouchableOpacity
                    style={[styles.requestButton, { backgroundColor: theme.primary }]}
                    onPress={handleRequest}
                >
                    <Text style={styles.requestButtonText}>Send Request to Driver</Text>
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
    infoBanner: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    infoText: {
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
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    hint: {
        fontSize: 12,
        marginLeft: 4,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayBadge: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '600',
    },
    requestButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    requestButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    }
});
