import { useUIStore } from '@/store/useUIStore';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import MapPicker from '../../components/MapPicker';
import { Colors } from '../../constants/theme';
import { RouteService } from '../../services/RouteService';
import { LatLng, useTripStore } from '../../store/useTripStore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AddClientRouteScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const addRoute = useTripStore((state) => state.addRoute);
    const { showToast } = useUIStore();

    const [points, setPoints] = useState<LatLng[]>([]);
    const [timeStart, setTimeStart] = useState('08:00');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [pointAddresses, setPointAddresses] = useState<string[]>([]);

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handlePointsChange = async (newPoints: LatLng[]) => {
        setPoints(newPoints);
        if (newPoints.length > 0) {
            try {
                const addresses = await Promise.all(
                    newPoints.map(p => RouteService.reverseGeocode(p.latitude, p.longitude))
                );
                setPointAddresses(addresses);
            } catch (error) {
                console.error('Failed to fetch addresses', error);
            }
        } else {
            setPointAddresses([]);
        }
    };

    const handleSave = async () => {
        if (points.length < 2) {
            showToast('Please select at least Pickup and Dropoff points', 'warning');
            return;
        }
        if (selectedDays.length === 0) {
            showToast('Please select at least one day', 'warning');
            return;
        }

        try {
            await addRoute({
                role: 'client',
                startPoint: { ...points[0], address: pointAddresses[0] },
                endPoint: { ...points[points.length - 1], address: pointAddresses[points.length - 1] },
                waypoints: points.slice(1, -1).map((p, i) => ({ ...p, address: pointAddresses[i + 1] })),
                timeStart,
                timeArrival: '', // Not needed for client
                days: selectedDays,
                price: 0,
                priceType: 'fix',
                status: 'pending',
            });
            showToast('Route created! We will matching you with drivers.', 'success');
            router.back();
        } catch (error) {
            showToast('Failed to create route', 'error');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surface }]}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>New Trajectory</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Select Points</Text>
                        <View style={[styles.mapContainer, { borderColor: theme.border }]}>
                            <MapPicker onPointsChange={handlePointsChange} theme={theme} />
                        </View>

                        {points.map((p, i) => (
                            <View key={i} style={styles.pointRow}>
                                <Text style={[styles.pointText, { color: theme.text }]}>
                                    {i === 0 ? 'Start: ' : i === points.length - 1 ? 'End: ' : `Way: `}
                                    {pointAddresses[i] || 'Selecting...'}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Schedule</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                            value={timeStart}
                            onChangeText={setTimeStart}
                            placeholder="Departure Time (e.g. 08:30)"
                        />
                        <View style={styles.daysGrid}>
                            {DAYS.map(day => (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayItem,
                                        { backgroundColor: selectedDays.includes(day) ? theme.primary : theme.surface }
                                    ]}
                                    onPress={() => toggleDay(day)}
                                >
                                    <Text style={{ color: selectedDays.includes(day) ? '#fff' : theme.text }}>{day}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.primary }]}
                        onPress={handleSave}
                    >
                        <Check size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>Create Route</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '800' },
    content: { padding: 24, gap: 32 },
    section: { gap: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    mapContainer: { height: 300, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
    pointRow: { padding: 12, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12 },
    pointText: { fontSize: 14, fontWeight: '600' },
    input: { height: 56, borderRadius: 18, borderWidth: 1, paddingHorizontal: 18, fontSize: 16 },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayItem: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
    saveButton: { height: 64, borderRadius: 32, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 },
    saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
