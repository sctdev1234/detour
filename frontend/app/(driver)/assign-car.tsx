import { useUIStore } from '@/store/useUIStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Percent, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useCarStore } from '../../store/useCarStore';

export default function AssignCarScreen() {
    const router = useRouter();
    const { carId } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { cars, assignCar } = useCarStore();
    const { showToast, showConfirm } = useUIStore();

    const car = cars.find(c => c.id === carId);

    const [email, setEmail] = useState('');
    const [split, setSplit] = useState('50');

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

    const handleAssign = () => {
        if (!email || !email.includes('@')) {
            showToast('Please enter a valid driver email', 'warning');
            return;
        }

        const splitValue = parseFloat(split);
        if (isNaN(splitValue) || splitValue < 0 || splitValue > 100) {
            showToast('Profit split must be between 0 and 100', 'warning');
            return;
        }

        assignCar(car.id, {
            driverEmail: email,
            profitSplit: splitValue,
            startDate: new Date().toISOString(),
            status: 'active' // In a real app, this might be 'pending' until accepted
        });

        showConfirm(
            'Success',
            `Car assigned to ${email} with ${splitValue}% profit split.`,
            () => router.back(),
            undefined,
            'OK',
            ''
        );
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
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={[styles.title, { color: '#fff' }]}>Assign Car</Text>
                <View style={{ width: 44 }} />
            </LinearGradient>

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
                            style={[styles.submitButton, { backgroundColor: theme.primary }]}
                            onPress={handleAssign}
                        >
                            <Text style={styles.submitButtonText}>Confirm Assignment</Text>
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
