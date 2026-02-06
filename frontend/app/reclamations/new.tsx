import { useUIStore } from '@/store/useUIStore';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useReclamationStore } from '../../store/useReclamationStore';

export default function NewReclamationScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { addReclamation } = useReclamationStore();
    const { showToast, showConfirm } = useUIStore();

    const [type, setType] = useState<'accident' | 'behaving' | 'lost_item' | 'other'>('other');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!subject || !description) {
            showToast('Please fill in subject and description', 'warning');
            return;
        }

        if (!user) return;

        setUploading(true);
        try {
            let evidenceUrl = undefined;
            if (image) {
                const id = Math.random().toString(36).substring(7);
                evidenceUrl = await import('../../services/storageService').then(m =>
                    m.uploadImage(image, `reclamations/${user.id}/${id}.jpg`)
                );
            }

            addReclamation({
                reporterId: user.id,
                type,
                subject,
                description,
                evidenceUrl,
            });

            showConfirm(
                'Success',
                'Reclamation submitted successfully',
                () => router.back(),
                undefined,
                'OK',
                ''
            );
        } catch (error) {
            showToast('Failed to submit reclamation', 'error');
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
                <Text style={[styles.title, { color: theme.text }]}>New Reclamation</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.form}>
                <View style={styles.group}>
                    <Text style={[styles.label, { color: theme.text }]}>Issue Type</Text>
                    <View style={styles.typeRow}>
                        {(['accident', 'behaving', 'lost_item', 'other'] as const).map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    styles.typeChip,
                                    { backgroundColor: type === t ? theme.primary : theme.surface, borderColor: theme.border }
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
                    <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="Brief summary of the issue"
                        placeholderTextColor={theme.icon}
                        value={subject}
                        onChangeText={setSubject}
                    />
                </View>

                <View style={styles.group}>
                    <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                    <TextInput
                        style={[styles.textArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="Provide detailed information..."
                        placeholderTextColor={theme.icon}
                        multiline
                        numberOfLines={4}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View style={styles.group}>
                    <Text style={[styles.label, { color: theme.text }]}>Evidence (Optional)</Text>
                    {image ? (
                        <View style={styles.imagePreview}>
                            <Image source={{ uri: image }} style={styles.thumb} />
                            <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
                                <X size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.uploadBox, { borderColor: theme.border, backgroundColor: theme.surface }]}
                            onPress={pickImage}
                        >
                            <Camera size={24} color={theme.icon} />
                            <Text style={[styles.uploadText, { color: theme.icon }]}>Add Photo</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary, opacity: uploading ? 0.7 : 1 }]}
                    onPress={handleSubmit}
                    disabled={uploading}
                >
                    <Text style={styles.submitText}>{uploading ? 'Submitting...' : 'Submit Reclamation'}</Text>
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
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    form: {
        padding: 24,
        gap: 28,
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
    },
    typeText: {
        fontWeight: '700',
        fontSize: 13,
    },
    input: {
        height: 56,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 20,
        fontSize: 16,
        fontWeight: '600',
    },
    textArea: {
        height: 140,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        textAlignVertical: 'top',
        fontSize: 16,
        fontWeight: '500',
    },
    uploadBox: {
        height: 140,
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    uploadText: {
        fontWeight: '700',
        fontSize: 14,
    },
    imagePreview: {
        width: 140,
        height: 140,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
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

