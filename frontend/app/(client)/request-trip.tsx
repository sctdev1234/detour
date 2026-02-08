import { useUIStore } from '@/store/useUIStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Clock, DollarSign, Info } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { PremiumInput } from '../../components/PremiumInput';
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

    const [proposedPrice, setProposedPrice] = useState(driverTrip?.routeId?.price?.toString() ?? '0');
    const [preferredTime, setPreferredTime] = useState(driverTrip?.routeId?.timeStart ?? '08:00');
    const [selectedDays, setSelectedDays] = useState<string[]>(driverTrip?.routeId?.days ?? []);

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
            startPoint: driverTrip.routeId.startPoint,
            endPoint: driverTrip.routeId.endPoint,
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
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 80, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Request Ride</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
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
                        <PremiumInput
                            value={proposedPrice}
                            onChangeText={setProposedPrice}
                            icon={DollarSign}
                            keyboardType="numeric"
                            style={{ fontSize: 20, fontWeight: '700' }}
                        />
                        <View style={styles.helperRow}>
                            <Text style={{ color: theme.icon, fontSize: 13, fontWeight: '500' }}>
                                Driver asks: ${driverTrip.routeId.price} {driverTrip.routeId.priceType === 'fix' ? '(Flat)' : '/km'}
                            </Text>
                        </View>
                    </View>

                    {/* Time Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferred Time</Text>
                        <PremiumInput
                            value={preferredTime}
                            onChangeText={setPreferredTime}
                            placeholder="08:00"
                            icon={Clock}
                        />
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
        </View>
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
        paddingHorizontal: 24,
        paddingTop: 20,
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
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    content: {
        padding: 24,
        gap: 24,
    },
    guideCard: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 24,
        gap: 16,
        alignItems: 'center',
        boxShadow: '0px 4px 12px rgba(0,0,0,0.03)',
        elevation: 2,
    },
    guideIcon: {
        width: 48,
        height: 48,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 4px 8px rgba(0,0,0,0.05)',
        elevation: 1,
    },
    guideText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
        opacity: 0.8,
    },
    section: {
        gap: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 4,
        marginBottom: 8,
    },
    helperRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingRight: 8,
        marginTop: -8,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    dayItem: {
        width: '18%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
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
        marginTop: 16,
        elevation: 6,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.15)',
        marginBottom: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});

