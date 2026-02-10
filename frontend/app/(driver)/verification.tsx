import { useUIStore } from '@/store/useUIStore';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { AlertCircle, Camera, CheckCircle, Clock, Upload, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

type DocType = 'cinFront' | 'cinBack' | 'license' | 'carRegistration' | 'facePhoto';

export default function VerificationScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { documents, updateDocuments, verificationStatus, setRole, user } = useAuthStore();
    const { showToast } = useUIStore();

    const [permission, requestPermission] = useCameraPermissions();
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraRef, setCameraRef] = useState<CameraView | null>(null);

    // ... pickImage, takeSelfie, handleCameraCapture ...

    const [isEditing, setIsEditing] = useState(false);
    const submissionCount = user?.documents?.length || 0;

    if (verificationStatus === 'pending' && !isEditing) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', padding: 24 }]}>
                <View style={[styles.pendingCard, { backgroundColor: theme.surface }]}>
                    <View style={[styles.pendingIconContainer, { backgroundColor: '#FF950015' }]}>
                        <Clock size={64} color="#FF9500" />
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>#{submissionCount}</Text>
                        </View>
                    </View>

                    <Text style={[styles.pendingTitle, { color: theme.text }]}>Under Review</Text>

                    <Text style={[styles.pendingText, { color: theme.icon }]}>
                        Thanks for submitting your documents! Our team is currently reviewing your application.
                    </Text>
                    <Text style={[styles.pendingSubText, { color: theme.icon }]}>
                        This process usually takes less than 24 hours. You'll be notified once approved.
                    </Text>

                    <TouchableOpacity
                        onPress={() => router.replace('/(driver)/profile')}
                        style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                    >
                        <Text style={styles.primaryButtonText}>Go to Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setIsEditing(true)}
                        style={[styles.secondaryButton, { borderColor: theme.border }]}
                    >
                        <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Update Documents</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (verificationStatus === 'verified') {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', padding: 24 }]}>
                <View style={[styles.pendingCard, { backgroundColor: theme.surface }]}>
                    <View style={[styles.pendingIconContainer, { backgroundColor: '#34C75915' }]}>
                        <CheckCircle size={64} color="#34C759" />
                    </View>

                    <Text style={[styles.pendingTitle, { color: theme.text }]}>You're Verified!</Text>

                    <Text style={[styles.pendingText, { color: theme.icon }]}>
                        Your documents have been approved. You are now authorized to drive with Detour.
                    </Text>

                    <TouchableOpacity
                        onPress={() => router.replace('/(driver)')}
                        style={[styles.primaryButton, { backgroundColor: theme.primary, marginTop: 24 }]}
                    >
                        <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ... existing pickImage etc functions ...

    const pickImage = async (type: DocType) => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8, // Reduced quality slightly for base64 size
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
            updateDocuments({ [type]: base64Img });
        }
    };

    const takeSelfie = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) return;
        }
        setCameraVisible(true);
    };

    const handleCameraCapture = async () => {
        if (cameraRef) {
            const photo = await cameraRef.takePictureAsync({ base64: true, quality: 0.8 });
            if (photo && photo.base64) {
                let base64Img = photo.base64;
                if (!base64Img.startsWith('data:image')) {
                    base64Img = `data:image/jpeg;base64,${photo.base64}`;
                }
                updateDocuments({ facePhoto: base64Img });
                setCameraVisible(false);
            }
        }
    };

    const handleSubmit = async () => {
        const { cinFront, cinBack, license, carRegistration, facePhoto } = documents;

        if (cinFront && cinBack && license && carRegistration && facePhoto) {
            try {
                await useAuthStore.getState().submitVerification(documents);
                setIsEditing(false); // Return to pending view
            } catch (error) {
                showToast('Failed to submit documents. Please try again.', 'error');
            }
        } else {
            showToast('Please upload all required documents', 'warning');
        }
    };

    if (cameraVisible) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView
                    style={styles.camera}
                    facing="front"
                    ref={(ref) => setCameraRef(ref)}
                >
                    <View style={styles.cameraControls}>
                        <TouchableOpacity style={styles.cameraButton} onPress={() => setCameraVisible(false)}>
                            <Text style={styles.cameraButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.cameraButton, styles.captureButton]} onPress={handleCameraCapture}>
                            <View style={styles.captureInner} />
                        </TouchableOpacity>
                        <View style={styles.cameraButton} />
                    </View>
                </CameraView>
            </View>
        );
    }

    const renderUploadButton = (label: string, type: DocType) => {
        const hasDoc = !!documents[type];

        return (
            <View style={styles.uploadRow}>
                <View style={styles.uploadInfo}>
                    <Text style={[styles.uploadLabel, { color: theme.text }]}>{label}</Text>
                    {hasDoc ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.statusText, { color: '#4CD964' }]}>Selected</Text>
                        </View>
                    ) : (
                        <Text style={[styles.statusText, { color: theme.icon }]}>Required</Text>
                    )}
                </View>

                {hasDoc ? (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: documents[type] }} style={styles.docPreview} />
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => updateDocuments({ [type]: undefined })}
                        >
                            <X size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.uploadButton,
                            { backgroundColor: theme.surface, borderColor: theme.border }
                        ]}
                        onPress={() => pickImage(type)}
                    >
                        <Upload size={20} color={theme.primary} />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.title, { color: theme.text }]}>Identity Verification</Text>
                </View>

                <View style={[styles.infoBox, { backgroundColor: '#0066FF10' }]}>
                    <AlertCircle size={20} color={theme.primary} />
                    <Text style={[styles.infoText, { color: theme.primary }]}>
                        Upload clear photos of your original documents. Blurry or photocopied images will be rejected.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Identity Documents</Text>
                    {renderUploadButton('CIN (Front)', 'cinFront')}
                    {renderUploadButton('CIN (Back)', 'cinBack')}
                    {renderUploadButton('Driving License', 'license')}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Vehicle Documents</Text>
                    {renderUploadButton('Car Registration (Carte Grise)', 'carRegistration')}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Face Verification</Text>
                    <View style={styles.faceSection}>
                        <View style={styles.faceInfo}>
                            <Text style={[styles.uploadLabel, { color: theme.text }]}>Live Selfie</Text>
                            {documents.facePhoto ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={[styles.statusText, { color: '#4CD964' }]}>Captured</Text>
                                </View>
                            ) : (
                                <Text style={[styles.statusText, { color: theme.icon }]}>Required for liveness check</Text>
                            )}
                        </View>

                        {documents.facePhoto ? (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: documents.facePhoto }} style={styles.docPreview} />
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => updateDocuments({ facePhoto: undefined })}
                                >
                                    <X size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[
                                    styles.uploadButton,
                                    { backgroundColor: theme.surface, borderColor: theme.border }
                                ]}
                                onPress={takeSelfie}
                            >
                                <Camera size={20} color={theme.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary }]}
                    onPress={handleSubmit}
                >
                    <Text style={styles.submitButtonText}>Submit for Review</Text>
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
    },
    switchButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
    },
    content: {
        padding: 24,
        gap: 32,
        paddingBottom: 40,
    },
    infoBox: {
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        gap: 16,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '500',
    },
    section: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    uploadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(0,0,0,0.01)',
    },
    uploadInfo: {
        flex: 1,
        gap: 4,
    },
    uploadLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    uploadButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    faceSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    faceInfo: {
        flex: 1,
        gap: 4,
    },
    submitButton: {
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        elevation: 6,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.15)',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
    },
    cameraControls: {
        position: 'absolute',
        bottom: 60,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    cameraButton: {
        width: 80,
        alignItems: 'center',
    },
    cameraButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'white',
    },
    captureInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
    },
    previewContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        position: 'relative',
    },
    docPreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        position: 'relative',
    },
    badgeContainer: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FF3B30',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    pendingCard: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 32,
        width: '100%',
        boxShadow: '0px 8px 24px rgba(0,0,0,0.06)',
        elevation: 4,
    },
    pendingTitle: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: -1,
    },
    pendingText: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: 12,
        fontWeight: '600',
    },
    pendingSubText: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 24,
        opacity: 0.6,
        marginBottom: 40,
        fontWeight: '500',
    },
    primaryButton: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    secondaryButton: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});

