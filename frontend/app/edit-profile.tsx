import { useUIStore } from '@/store/useUIStore';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Camera, Check, ChevronRight, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { PremiumInput } from '../components/PremiumInput';
import { Colors } from '../constants/theme';
import { useUpdateProfile } from '../hooks/api/useAuthQueries';
import { useAuthStore } from '../store/useAuthStore';

export default function EditProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user, updateUser } = useAuthStore();
    const { mutateAsync: updateProfile } = useUpdateProfile();
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
                const imageUrl = await import('../services/storageService').then(m =>
                    m.uploadImage(asset.uri, 'profiles')
                );

                // Directly update profile with Firebase URL
                await updateProfile({ photoURL: imageUrl });

                showToast('Profile photo updated', 'success');
            }
        } catch (error: any) {
            console.error('Image upload failed:', error);
            showToast(error.message || 'Failed to update image', 'error');
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
            showConfirm({
                title: 'Success',
                message: 'Profile updated successfully',
                confirmText: 'OK',
                onConfirm: () => router.back()
            });
        } catch (error) {
            console.error(error);
            showToast('Failed to update profile', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 20, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Edit Profile</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Image Upload */}
                    <View style={styles.avatarSection}>
                        <LinearGradient
                            colors={[theme.primary, theme.secondary]}
                            style={styles.avatarBorder}
                        >
                            <TouchableOpacity onPress={pickImage} style={[styles.avatarContainer, { backgroundColor: theme.surface }]}>
                                {user?.photoURL ? (
                                    <Image source={{ uri: user.photoURL }} style={styles.avatarImage} contentFit="cover" transition={500} />
                                ) : (
                                    <User size={40} color={theme.icon} />
                                )}
                            </TouchableOpacity>

                        </LinearGradient>
                        <TouchableOpacity onPress={pickImage} style={[styles.cameraBadge, { backgroundColor: theme.primary, borderColor: theme.surface }]}>
                            <Camera size={14} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.changePhotoText, { color: theme.primary }]}>Change Photo</Text>
                    </View>

                    <PremiumInput
                        label="Full Name"
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Enter your full name"
                        icon={User}
                    />

                    <PremiumInput
                        label="Email Address"
                        value={user?.email || ''}
                        editable={false}
                        icon={Mail}
                        style={{ opacity: 0.6 }}
                    />

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

                {(uploadingImage || isLoading) && (
                    <View style={styles.fullScreenLoading}>
                        <View style={[styles.loadingCard, { backgroundColor: theme.surface }]}>
                            <ActivityIndicator size="large" color={theme.primary} />
                            <Text style={[styles.loadingText, { color: theme.text }]}>
                                {uploadingImage ? 'Uploading Photo...' : 'Saving Changes...'}
                            </Text>
                        </View>
                    </View>
                )}
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
    content: {
        padding: 24,
        gap: 16,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
        position: 'relative',
    },
    avatarBorder: {
        padding: 4,
        borderRadius: 60,
        marginBottom: 12,
    },
    avatarContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 30, // Adjusted for larger avatar
        right: '32%',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        elevation: 4,
    },
    changePhotoText: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: -4,
    },
    saveButton: {
        flexDirection: 'row',
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginTop: 24,
        elevation: 6,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.15)',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    passwordLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginTop: 8,
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
    fullScreenLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingCard: {
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        gap: 16,
        boxShadow: '0px 8px 24px rgba(0,0,0,0.2)',
        elevation: 10,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '700',
    },
});


