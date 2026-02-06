import { useUIStore } from '@/store/useUIStore';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Check, ChevronRight, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

export default function EditProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user, updateProfile, uploadProfileImage } = useAuthStore();
    const { showToast, showConfirm } = useUIStore();

    const [displayName, setDisplayName] = useState(user?.fullName || '');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled) {
                setUploadingImage(true);
                const asset = result.assets[0];

                // Create FormData
                const formData = new FormData();
                formData.append('image', {
                    uri: asset.uri,
                    name: asset.fileName || 'profile.jpg',
                    type: asset.mimeType || 'image/jpeg',
                } as any);

                const url = await uploadProfileImage(formData);
                await updateProfile({ photoURL: url });

                showToast('Profile photo updated', 'success');
            }
        } catch (error: any) {
            console.error('Image upload failed:', error);
            showToast(error.message || 'Failed to upload image', 'error');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        if (!displayName.trim()) {
            showToast('Name cannot be empty', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            await updateProfile({ fullName: displayName.trim() });
            showConfirm(
                'Success',
                'Profile updated successfully',
                () => router.back(),
                undefined,
                'OK',
                ''
            );
        } catch (error) {
            console.error(error);
            showToast('Failed to update profile', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surface }]}>
                    <ArrowLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Edit Profile</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Image Upload */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={pickImage} style={[styles.avatarContainer, { borderColor: theme.border }]}>
                            {user?.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                            ) : (
                                <User size={40} color={theme.icon} />
                            )}
                            {uploadingImage && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator color="#fff" />
                                </View>
                            )}
                            <View style={[styles.cameraBadge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
                                <Camera size={14} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.changePhotoText, { color: theme.primary }]}>Change Photo</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <User size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="Enter your full name"
                                placeholderTextColor={theme.icon}
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border, opacity: 0.6 }]}>
                            <Mail size={20} color={theme.icon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                value={user?.email || ''}
                                editable={false}
                            />
                        </View>
                    </View>

                    {/* Change Password Link */}
                    <TouchableOpacity
                        style={[styles.passwordLink, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => router.push('/change-password')}
                    >
                        <View style={styles.passwordLinkContent}>
                            <Lock size={20} color={theme.text} />
                            <Text style={[styles.passwordLinkText, { color: theme.text }]}>Change Password</Text>
                        </View>
                        <ChevronRight size={20} color={theme.icon} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.primary }]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Check size={20} color="#fff" />
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </>
                        )}
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
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
        elevation: 3,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    content: {
        padding: 24,
        paddingTop: 10,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 12,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
    },
    changePhotoText: {
        fontSize: 14,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 28,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
        opacity: 0.8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 20,
        gap: 14,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        height: '100%',
    },
    saveButton: {
        flexDirection: 'row',
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginTop: 24,
        elevation: 6,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.15)',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    passwordLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    passwordLinkContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    passwordLinkText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

