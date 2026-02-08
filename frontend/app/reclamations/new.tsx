import { useUIStore } from '@/store/useUIStore';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, FileText, Type, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { PremiumInput } from '../../components/PremiumInput';
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
            <LinearGradient
                colors={[theme.primary, theme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={[styles.title, { color: '#fff' }]}>New Reclamation</Text>
                <View style={{ width: 44 }} />
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.form}>
                    <View style={styles.group}>
                        <Text style={[styles.label, { color: theme.text }]}>Issue Type</Text>
                        <View style={styles.typeRow}>
                            {(['accident', 'behaving', 'lost_item', 'other'] as const).map((t) => (
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
                        <Text style={[styles.label, { color: theme.text }]}>Evidence (Optional)</Text>
                        {image ? (
                            <View style={[styles.imagePreview, { borderColor: theme.border }]}>
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
                                <Camera size={32} color={theme.primary} style={{ opacity: 0.8 }} />
                                <Text style={[styles.uploadText, { color: theme.icon }]}>Tap to upload photo</Text>
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

