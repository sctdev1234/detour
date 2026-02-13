import { useUIStore } from '@/store/useUIStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Percent, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useAssignCar, useCars } from '../../hooks/api/useCarQueries';
import { useAuthStore } from '../../store/useAuthStore';

export default function AssignCarScreen() {
    const router = useRouter();
    const { carId } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const user = useAuthStore((state) => state.user);
    const { data: cars = [] } = useCars(user?.id);
    const { mutateAsync: assignCar, isPending: isAssigning } = useAssignCar();
    const { showToast, showConfirm } = useUIStore();

    const car = cars.find(c => c.id === carId);

    const [email, setEmail] = useState('');
    const [split, setSplit] = useState('50'); // Default to 50% for owner

    if (!car) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.text }}>Car not found</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: theme.primary, marginTop: 16, fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleAssign = async () => {
        if (!email || !email.includes('@')) {
            showToast('Please enter a valid driver email', 'warning');
            return;
        }

        const splitValue = parseFloat(split);
        if (isNaN(splitValue) || splitValue < 0 || splitValue > 100) {
            showToast('Profit split must be between 0 and 100', 'warning');
            return;
        }

        try {
            await assignCar({
                id: car.id,
                assignment: {
                    driverEmail: email,
                    profitSplit: splitValue,
                    startDate: new Date().toISOString(),
                    status: 'active' // In a real app, this might be 'pending' until accepted
                }
            });

            showConfirm({
                title: 'Success',
                message: `Car assigned to ${email} with ${splitValue}% profit split.`,
                confirmText: 'OK',
                cancelText: 'Close',
                onConfirm: () => router.back()
            });
        } catch (error: any) {
            showToast('Failed to assign car', 'error');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 80, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Assign Car</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.carInfo, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.carName, { color: theme.text }]}>{car.marque} {car.model}</Text>
                        <Text style={[styles.carDetail, { color: theme.icon }]}>{car.year} • {car.color}</Text>
                    </View>

                    <View style={styles.form}>
                        <PremiumInput
                            label="Driver Email"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="driver@example.com"
                            icon={UserPlus}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View>
                            <PremiumInput
                                label="Profit Split (Your Share %)"
                                value={split}
                                onChangeText={setSplit}
                                placeholder="50"
                                icon={Percent}
                                keyboardType="numeric"
                            />
                            <Text style={[styles.helper, { color: theme.icon }]}>
                                You keep {split}%, driver gets {100 - (parseFloat(split) || 0)}%.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isAssigning ? 0.7 : 1 }]}
                            onPress={handleAssign}
                            disabled={isAssigning}
                        >
                            <Text style={styles.submitButtonText}>{isAssigning ? 'Assigning...' : 'Confirm Assignment'}</Text>
                        </TouchableOpacity>
                    </View>
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
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    content: {
        padding: 24,
    },
    carInfo: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 32,
        alignItems: 'center',
        boxShadow: '0px 4px 12px rgba(0,0,0,0.05)',
        elevation: 2,
    },
    carName: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 6,
    },
    carDetail: {
        fontSize: 15,
        fontWeight: '500',
        opacity: 0.8,
    },
    form: {
        gap: 20,
    },
    helper: {
        fontSize: 13,
        marginLeft: 8,
        marginTop: 6,
        opacity: 0.8,
    },
    submitButton: {
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        elevation: 6,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.15)',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
