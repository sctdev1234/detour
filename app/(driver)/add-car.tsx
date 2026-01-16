import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, useColorScheme, Switch, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useCarStore } from '../../store/useCarStore';
import { ChevronLeft, Car as CarIcon } from 'lucide-react-native';

export default function AddCarScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const addCar = useCarStore((state) => state.addCar);

    const [form, setForm] = useState({
        marque: '',
        model: '',
        year: '',
        color: '',
        places: '4',
        isDefault: false,
    });

    const handleSave = () => {
        if (!form.marque || !form.model || !form.year || !form.color) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        addCar({
            marque: form.marque,
            model: form.model,
            year: form.year,
            color: form.color,
            places: parseInt(form.places) || 4,
            isDefault: form.isDefault,
        });

        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Add New Car</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.formContent}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.icon }]}>Brand (Marque)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. Toyota"
                        placeholderTextColor={theme.icon}
                        value={form.marque}
                        onChangeText={(text) => setForm({ ...form, marque: text })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.icon }]}>Model</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. Camry"
                        placeholderTextColor={theme.icon}
                        value={form.model}
                        onChangeText={(text) => setForm({ ...form, model: text })}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: theme.icon }]}>Year</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                            placeholder="2022"
                            placeholderTextColor={theme.icon}
                            keyboardType="numeric"
                            value={form.year}
                            onChangeText={(text) => setForm({ ...form, year: text })}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: theme.icon }]}>Places (Seats)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                            placeholder="4"
                            placeholderTextColor={theme.icon}
                            keyboardType="numeric"
                            value={form.places}
                            onChangeText={(text) => setForm({ ...form, places: text })}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.icon }]}>Color</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. Black"
                        placeholderTextColor={theme.icon}
                        value={form.color}
                        onChangeText={(text) => setForm({ ...form, color: text })}
                    />
                </View>

                <View style={[styles.switchGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View>
                        <Text style={[styles.switchLabel, { color: theme.text }]}>Set as Default Car</Text>
                        <Text style={[styles.switchSubtitle, { color: theme.icon }]}>Use this car for your trips by default</Text>
                    </View>
                    <Switch
                        value={form.isDefault}
                        onValueChange={(value) => setForm({ ...form, isDefault: value })}
                        trackColor={{ false: theme.border, true: theme.primary }}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.primary }]}
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Save Car</Text>
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
    formContent: {
        padding: 24,
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    input: {
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    switchGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 8,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    switchSubtitle: {
        fontSize: 12,
    },
    saveButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
