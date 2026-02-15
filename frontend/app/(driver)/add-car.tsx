import { useUIStore } from '@/store/useUIStore';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Calendar, Camera, Car as CarIcon, Palette, Plus, Upload, Users, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useAddCar, useCars } from '../../hooks/api/useCarQueries';
import { useAuthStore } from '../../store/useAuthStore';

export default function AddCarScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const user = useAuthStore((state) => state.user);
    const { data: cars = [] } = useCars();
    const { mutateAsync: addCar, isPending: isAdding } = useAddCar();
    const { showToast } = useUIStore();

    // Check if it's the user's first car
    const isFirstCar = cars.length === 0;

    // Force isDefault to true if it's the first car
    React.useEffect(() => {
        if (isFirstCar && !form.isDefault) {
            setForm(prev => ({ ...prev, isDefault: true }));
        }
    }, [isFirstCar]);

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
            setForm(prev => ({
                ...prev,
                isDefault: (isFirstCar || prev.images.length === 0) ? true : prev.isDefault,
                images: [...prev.images, result.assets[0].uri]
            }));
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
                form.images.map(async (uri) => {
                    return await import('../../services/storageService').then(m =>
                        m.uploadImage(uri, 'cars')
                    );
                })
            );

            // Upload Documents
            const uploadedDocs = { ...form.documents };
            for (const [key, uri] of Object.entries(form.documents)) {
                if (uri) {
                    const url = await import('../../services/storageService').then(m =>
                        m.uploadImage(uri, 'car-documents')
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
                isDefault: isFirstCar ? true : form.isDefault,
                images: uploadedImages,
                documents: uploadedDocs,
                ownerId: user.id
            });

            router.back();
            showToast('Car added successfully', 'success');
        } catch (error: any) {
            showToast('Failed to save car. ' + (error.message || ''), 'error');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const isLoading = isAdding || uploading;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 20, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Add New Car</Text>
            </View>

            <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                    <PremiumInput
                        label="Brand (Marque)"
                        value={form.marque}
                        onChangeText={(text) => setForm({ ...form, marque: text })}
                        placeholder="e.g. Toyota"
                        icon={CarIcon}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <PremiumInput
                        label="Model"
                        value={form.model}
                        onChangeText={(text) => setForm({ ...form, model: text })}
                        placeholder="e.g. Camry"
                        icon={CarIcon}
                    />
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <PremiumInput
                            label="Year"
                            value={form.year}
                            onChangeText={(text) => setForm({ ...form, year: text })}
                            placeholder="2022"
                            keyboardType="numeric"
                            icon={Calendar}
                        />
                    </View>
                    <View style={{ width: 16 }} />
                    <View style={{ flex: 1 }}>
                        <PremiumInput
                            label="Places"
                            value={form.places}
                            onChangeText={(text) => setForm({ ...form, places: text })}
                            placeholder="4"
                            keyboardType="numeric"
                            icon={Users}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <PremiumInput
                        label="Color"
                        value={form.color}
                        onChangeText={(text) => setForm({ ...form, color: text })}
                        placeholder="e.g. Black"
                        icon={Palette}
                    />
                </View>

                {/* Car Photos */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.text }]}>Car Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                        {form.images.map((uri, index) => (
                            <View key={index} style={[styles.photoItem, { borderColor: theme.border }]}>
                                <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" transition={500} />
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
                        { key: 'registration', label: 'Car Registration' },
                        { key: 'insurance', label: 'Insurance' },
                        { key: 'technicalVisit', label: 'Technical Visit' }
                    ].map((doc) => (
                        <View key={doc.key} style={[styles.docRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={styles.docInfo}>
                                <Text style={[styles.docLabel, { color: theme.text }]}>{doc.label}</Text>
                                <Text style={[styles.docStatus, { color: form.documents[doc.key as keyof typeof form.documents] ? '#10b981' : theme.icon }]}>
                                    {form.documents[doc.key as keyof typeof form.documents] ? 'Uploaded' : 'Required'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.uploadButton, { backgroundColor: form.documents[doc.key as keyof typeof form.documents] ? 'rgba(16, 185, 129, 0.1)' : theme.surface, borderColor: theme.border }]}
                                onPress={() => pickDocument(doc.key as any)}
                            >
                                {form.documents[doc.key as keyof typeof form.documents] ? <Upload size={18} color="#10b981" /> : <Plus size={18} color={theme.primary} />}
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <View style={[styles.switchGroup, { backgroundColor: theme.surface, borderColor: theme.border, opacity: isFirstCar ? 0.8 : 1 }]}>
                    <View>
                        <Text style={[styles.switchLabel, { color: theme.text }]}>Set as Default Car</Text>
                        <Text style={[styles.switchSubtitle, { color: theme.icon }]}>
                            {isFirstCar ? 'First car is set as default automatically' : 'Use this car for your trips by default'}
                        </Text>
                    </View>
                    <Switch
                        value={isFirstCar || form.isDefault}
                        onValueChange={(value) => { if (!isFirstCar) setForm({ ...form, isDefault: value }); }}
                        disabled={isFirstCar}
                        trackColor={{ false: theme.border, true: theme.primary }}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    <Text style={styles.saveButtonText}>{isLoading ? 'Saving...' : 'Save Car'}</Text>
                </TouchableOpacity>
            </ScrollView>

            {isLoading && (
                <View style={styles.fullScreenLoading}>
                    <View style={[styles.loadingCard, { backgroundColor: theme.surface }]}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.loadingText, { color: theme.text }]}>Saving Your Car...</Text>
                        <Text style={[styles.loadingSubText, { color: theme.icon }]}>Uploading photos and documents to cloud</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
    },
    formContent: {
        padding: 24,
        gap: 16,
        paddingBottom: 40,
    },
    inputGroup: {
        // Handled by PremiumInput
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 4,
        textTransform: 'uppercase',
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
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
    fullScreenLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingCard: {
        padding: 40,
        borderRadius: 32,
        alignItems: 'center',
        gap: 16,
        boxShadow: '0px 8px 24px rgba(0,0,0,0.2)',
        elevation: 10,
        width: '80%',
    },
    loadingText: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    loadingSubText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        opacity: 0.7,
    },
});

