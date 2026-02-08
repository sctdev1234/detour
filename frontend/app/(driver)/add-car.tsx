import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, Plus, Upload, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useCarStore } from '../../store/useCarStore';

import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';

export default function AddCarScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const addCar = useCarStore((state) => state.addCar);
    const user = useAuthStore((state) => state.user);
    const { showToast } = useUIStore();

    const [form, setForm] = useState({
        marque: '',
        model: '',
        year: '',
        color: '',
        places: '4',
        isDefault: false,
        images: [] as string[],
        documents: {
            registration: '',
            insurance: '',
            technicalVisit: '',
        },
    });

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setForm(prev => ({ ...prev, images: [...prev.images, result.assets[0].uri] }));
        }
    };

    const removeImage = (index: number) => {
        setForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const pickDocument = async (type: 'registration' | 'insurance' | 'technicalVisit') => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            setForm(prev => ({
                ...prev,
                documents: { ...prev.documents, [type]: result.assets[0].uri }
            }));
        }
    };

    const [uploading, setUploading] = useState(false);

    const handleSave = async () => {
        console.log('Saving car with form:', form);
        if (!form.marque || !form.model || !form.year || !form.color) {
            console.log('Validation failed:', { marque: !!form.marque, model: !!form.model, year: !!form.year, color: !!form.color });
            showToast('Please fill in all fields', 'warning');
            return;
        }

        if (!user?.id) {
            showToast('User not identified', 'error');
            return;
        }

        setUploading(true);
        try {
            // Upload Images
            const uploadedImages = await Promise.all(
                form.images.map(async (uri, index) => {
                    const id = Math.random().toString(36).substring(7);
                    // Use a flatter structure or just let storageService handle names
                    return await import('../../services/storageService').then(m =>
                        m.uploadImage(uri, `cars/${id}/images/${index}.jpg`)
                    );
                })
            );

            // Upload Documents
            const uploadedDocs = { ...form.documents };
            for (const [key, uri] of Object.entries(form.documents)) {
                if (uri) {
                    const id = Math.random().toString(36).substring(7);
                    const url = await import('../../services/storageService').then(m =>
                        m.uploadImage(uri, `cars/${id}/documents/${key}.jpg`)
                    );
                    uploadedDocs[key as keyof typeof uploadedDocs] = url;
                }
            }

            await addCar({
                marque: form.marque,
                model: form.model,
                year: form.year,
                color: form.color,
                places: parseInt(form.places) || 4,
                isDefault: form.isDefault,
                images: uploadedImages,
                documents: uploadedDocs,
            }, user.id); // Pass user.id

            router.back();
        } catch (error: any) {
            showToast('Failed to save car. ' + (error.message || ''), 'error');
            console.error(error);
        } finally {
            setUploading(false);
        }
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

                {/* Car Photos */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.text }]}>Car Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                        {form.images.map((uri, index) => (
                            <View key={index} style={styles.photoItem}>
                                <Image source={{ uri }} style={styles.photoThumb} />
                                <TouchableOpacity
                                    style={styles.removePhoto}
                                    onPress={() => removeImage(index)}
                                >
                                    <X size={12} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity
                            style={[styles.addPhotoButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                            onPress={pickImage}
                        >
                            <Camera size={24} color={theme.icon} />
                            <Text style={[styles.addPhotoText, { color: theme.icon }]}>Add</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Documents */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.text, marginBottom: 12 }]}>Documents</Text>

                    {[
                        { key: 'registration', label: 'Car Registration (Carte Grise)' },
                        { key: 'insurance', label: 'Insurance' },
                        { key: 'technicalVisit', label: 'Technical Visit' }
                    ].map((doc) => (
                        <View key={doc.key} style={styles.docRow}>
                            <View style={styles.docInfo}>
                                <Text style={[styles.docLabel, { color: theme.text }]}>{doc.label}</Text>
                                <Text style={[styles.docStatus, { color: form.documents[doc.key as keyof typeof form.documents] ? '#4CD964' : theme.icon }]}>
                                    {form.documents[doc.key as keyof typeof form.documents] ? 'Uploaded' : 'Required'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.uploadButton, { backgroundColor: form.documents[doc.key as keyof typeof form.documents] ? '#4CD96420' : theme.surface }]}
                                onPress={() => pickDocument(doc.key as any)}
                            >
                                {form.documents[doc.key as keyof typeof form.documents] ? <Upload size={18} color="#4CD964" /> : <Plus size={18} color={theme.primary} />}
                            </TouchableOpacity>
                        </View>
                    ))}
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
                    style={[styles.saveButton, { backgroundColor: theme.primary, opacity: uploading ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={uploading}
                >
                    <Text style={styles.saveButtonText}>{uploading ? 'Uploading...' : 'Save Car'}</Text>
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
        paddingTop: 60,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
    },
    formContent: {
        padding: 24,
        gap: 24,
        paddingBottom: 40,
    },
    inputGroup: {
        gap: 10,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 4,
        textTransform: 'uppercase',
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    input: {
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    section: {
        gap: 12,
        marginTop: 8,
    },
    photoList: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 4,
    },
    photoItem: {
        width: 100,
        height: 100,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 12,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    photoThumb: {
        width: '100%',
        height: '100%',
    },
    removePhoto: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoButton: {
        width: 100,
        height: 100,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    addPhotoText: {
        fontSize: 12,
        fontWeight: '700',
    },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(0,0,0,0.01)',
    },
    docInfo: {
        flex: 1,
        gap: 4,
    },
    docLabel: {
        fontSize: 14,
        fontWeight: '700',
    },
    docStatus: {
        fontSize: 12,
        fontWeight: '600',
    },
    uploadButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    switchGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginTop: 8,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.03)',
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    switchSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.6,
    },
    saveButton: {
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        elevation: 6,
        boxShadow: '0px 8px 20px rgba(0,0,0,0.15)',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
});

