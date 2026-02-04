import { useUIStore } from '@/store/useUIStore';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { AlertCircle, Camera, Check, ChevronLeft, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

type DocType = 'cinFront' | 'cinBack' | 'license' | 'carRegistration' | 'facePhoto';

export default function VerificationScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { documents, updateDocuments, setVerificationStatus } = useAuthStore();
    const { showToast, showConfirm } = useUIStore();

    const [permission, requestPermission] = useCameraPermissions();
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraRef, setCameraRef] = useState<CameraView | null>(null);

    const pickImage = async (type: DocType) => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            updateDocuments({ [type]: result.assets[0].uri });
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
            const photo = await cameraRef.takePictureAsync();
            if (photo) {
                updateDocuments({ facePhoto: photo.uri });
                setCameraVisible(false);
            }
        }
    };

    const handleSubmit = () => {
        const { cinFront, cinBack, license, carRegistration, facePhoto } = documents;

        if (cinFront && cinBack && license && carRegistration && facePhoto) {
            setVerificationStatus('pending');
            showConfirm(
                'Success',
                'Documents submitted for review!',
                () => router.back(),
                undefined,
                'OK',
                ''
            );
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
                        <Text style={[styles.statusText, { color: '#4CD964' }]}>Uploaded</Text>
                    ) : (
                        <Text style={[styles.statusText, { color: theme.icon }]}>Required</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={[
                        styles.uploadButton,
                        { backgroundColor: hasDoc ? '#4CD96420' : theme.surface, borderColor: hasDoc ? '#4CD964' : theme.border }
                    ]}
                    onPress={() => pickImage(type)}
                >
                    {hasDoc ? <Check size={20} color="#4CD964" /> : <Upload size={20} color={theme.primary} />}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Identity Verification</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
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
                                <Text style={[styles.statusText, { color: '#4CD964' }]}>Captured</Text>
                            ) : (
                                <Text style={[styles.statusText, { color: theme.icon }]}>Required for liveness check</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.uploadButton,
                                { backgroundColor: documents.facePhoto ? '#4CD96420' : theme.surface, borderColor: documents.facePhoto ? '#4CD964' : theme.border }
                            ]}
                            onPress={takeSelfie}
                        >
                            {documents.facePhoto ? <Check size={20} color="#4CD964" /> : <Camera size={20} color={theme.primary} />}
                        </TouchableOpacity>
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
        gap: 32,
        paddingBottom: 40,
    },
    infoBox: {
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    section: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    uploadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    uploadInfo: {
        flex: 1,
    },
    uploadLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    statusText: {
        fontSize: 12,
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
    },
    faceInfo: {
        flex: 1,
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
    cameraContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
    },
    cameraControls: {
        position: 'absolute',
        bottom: 40,
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
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: 'black',
        backgroundColor: 'white',
    },
});
