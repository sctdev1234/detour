import { useUIStore } from '@/store/useUIStore';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, FileText, Type, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useAddReclamation } from '../../hooks/api/useReclamationQueries';

export default function NewReclamationScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { showToast, showConfirm } = useUIStore();
    const { mutateAsync: addReclamation } = useAddReclamation();

    const [type, setType] = useState<'accident' | 'behaving' | 'lost_item' | 'technical' | 'other'>('technical');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false, // Editing multiple images is complex, simplify for now
            quality: 0.8,
            allowsMultipleSelection: true,
            selectionLimit: 5
        });

        if (!result.canceled) {
            setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!subject || !description) {
            showToast('Please fill in subject and description', 'warning');
            return;
        }

        setUploading(true);
        try {
            const evidenceUrls = [];

            if (images.length > 0) {
                const uploadPromises = images.map(async (img) => {
                    const id = Math.random().toString(36).substring(7);
                    return await import('../../services/storageService').then(m =>
                        m.uploadImage(img, `reclamations/${id}.jpg`)
                    );
                });

                const uploadedUrls = await Promise.all(uploadPromises);
                evidenceUrls.push(...uploadedUrls);
            }

            await addReclamation({
                type,
                subject,
                description,
                evidenceUrls,
            });

            showConfirm({
                title: 'Success',
                message: 'Reclamation submitted successfully',
                confirmText: 'OK',
                onConfirm: () => router.back()
            });
        } catch (error) {
            showToast('Failed to submit reclamation', 'error');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 20, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>New Reclamation</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.form}>
                    <View style={styles.group}>
                        <Text style={[styles.label, { color: theme.text }]}>Issue Type</Text>
                        <View style={styles.typeRow}>
                            {(['accident', 'behaving', 'lost_item', 'technical', 'other'] as const).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.typeChip,
                                        { backgroundColor: type === t ? theme.primary : theme.surface, borderColor: type === t ? theme.primary : theme.border }
                                    ]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={[
                                        styles.typeText,
                                        { color: type === t ? '#fff' : theme.text }
                                    ]}>
                                        {t.toUpperCase().replace('_', ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.group}>
                        <PremiumInput
                            label="Subject"
                            value={subject}
                            onChangeText={setSubject}
                            placeholder="Brief summary of the issue"
                            icon={Type}
                        />
                    </View>

                    <View style={styles.group}>
                        <PremiumInput
                            label="Description"
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Provide detailed information..."
                            icon={FileText}
                            multiline
                            numberOfLines={4}
                            style={{ height: 120, textAlignVertical: 'top', paddingTop: 12 }}
                        />
                    </View>

                    <View style={styles.group}>
                        <Text style={[styles.label, { color: theme.text }]}>Evidence (Optional) - {images.length}/5</Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {images.map((img, index) => (
                                <View key={index} style={[styles.imagePreview, { borderColor: theme.border, width: 100, height: 100 }]}>
                                    <Image source={{ uri: img }} style={styles.thumb} contentFit="cover" transition={500} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                                        <X size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {images.length < 5 && (
                                <TouchableOpacity
                                    style={[styles.uploadBox, { borderColor: theme.border, backgroundColor: theme.surface, width: 100, height: 100 }]}
                                    onPress={pickImage}
                                >
                                    <Camera size={24} color={theme.primary} style={{ opacity: 0.8 }} />
                                    <Text style={[styles.uploadText, { color: theme.icon, fontSize: 12 }]}>Add</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, { backgroundColor: theme.primary, opacity: uploading ? 0.7 : 1 }]}
                        onPress={handleSubmit}
                        disabled={uploading}
                    >
                        <Text style={styles.submitText}>{uploading ? 'Submitting...' : 'Submit Reclamation'}</Text>
                    </TouchableOpacity>
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
    form: {
        padding: 24,
        gap: 24,
        paddingBottom: 40,
    },
    group: {
        gap: 12,
    },
    label: {
        fontWeight: '700',
        fontSize: 13,
        textTransform: 'uppercase',
        opacity: 0.7,
        letterSpacing: 0.5,
        marginLeft: 4,
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    typeChip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 2,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
    },
    typeText: {
        fontWeight: '700',
        fontSize: 13,
    },
    uploadBox: {
        height: 160,
        borderRadius: 24,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    uploadText: {
        fontWeight: '600',
        fontSize: 15,
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
    },
    thumb: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
    },
    submitButton: {
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        elevation: 6,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.15)',
    },
    submitText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 18,
    }
});

