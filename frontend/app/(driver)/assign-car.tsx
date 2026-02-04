import { useUIStore } from '@/store/useUIStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Percent, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
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
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.text }}>Car not found</Text>
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Assign Car</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={[styles.carInfo, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.carName, { color: theme.text }]}>{car.marque} {car.model}</Text>
                    <Text style={[styles.carDetail, { color: theme.icon }]}>{car.year} • {car.color}</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Driver Email</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <UserPlus size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="driver@example.com"
                                placeholderTextColor={theme.icon}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Profit Split (Your Share %)</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Percent size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="50"
                                placeholderTextColor={theme.icon}
                                value={split}
                                onChangeText={setSplit}
                                keyboardType="numeric"
                            />
                        </View>
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
            </View>
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
    },
    carInfo: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 32,
        alignItems: 'center',
    },
    carName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    carDetail: {
        fontSize: 14,
    },
    form: {
        gap: 24,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
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
        height: '100%',
    },
    helper: {
        fontSize: 12,
        marginLeft: 4,
    },
    submitButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    assignmentCard: {
        padding: 24,
        borderRadius: 20,
        borderWidth: 1,
    },
    assignmentLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    assignmentValue: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee', // or theme border
        marginVertical: 12,
    },
    revokeButton: {
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    revokeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
