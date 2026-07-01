import { useUIStore } from '@/store/useUIStore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Globe, ArrowRight, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';
import { PremiumButton } from '../../components/PremiumButton';
import { Colors } from '../../constants/theme';
import { useGuestLogin } from '../../hooks/api/useAuthQueries';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import Checkbox from 'expo-checkbox';

export default function WelcomeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { showToast } = useUIStore();
    
    const { mutateAsync: guestLogin, isPending: loadingGuest } = useGuestLogin();
    
    // Feature flag for Guest mode
    const ENABLE_GUEST_MODE = true;

    const [termsAccepted, setTermsAccepted] = useState(false);
    const [language, setLanguage] = useState('en');

    const handleContinue = (path: any) => {
        if (!termsAccepted) {
            showToast('Please accept the Terms of Service to continue', 'warning');
            return;
        }
        router.push(path);
    };

    const handleGuestAccess = async () => {
        if (!termsAccepted) {
            showToast('Please accept the Terms of Service to continue', 'warning');
            return;
        }
        
        try {
            // Get device ID or generate a fallback one
            let deviceId = 'guest-web-' + Date.now();
            if (Platform.OS === 'ios') {
                deviceId = await Application.getIosIdForVendorAsync() || deviceId;
            } else if (Platform.OS === 'android') {
                deviceId = Application.getAndroidId() || deviceId;
            }
            
            await guestLogin(deviceId);
            // Router will automatically redirect based on role (which is empty) 
            // useRouteGuard will send them to role-selection. We should let useRouteGuard handle it,
            // but for guest, the role is 'guest'. Wait, guest role isn't defined, or maybe role is null.
            // Let's just push them manually to passenger home if role is guest.
        } catch (error: any) {
            showToast(error.message || 'Failed to enter guest mode', 'error');
        }
    };

    return (
        <LinearGradient colors={[theme.background, theme.surface]} style={styles.container}>
            <View style={styles.contentContainer}>
                <Animated.View entering={FadeInDown.delay(200).duration(1000).springify()} style={styles.header}>
                    <View style={[styles.logoContainer, { backgroundColor: theme.surface }]}>
                        <Image
                            source={require('../../assets/images/logo.png')}
                            style={styles.logo}
                            contentFit="contain"
                        />
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>Welcome to Detour</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>Your premium ride experience</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(400).duration(1000).springify()} style={{ width: '100%' }}>
                    <GlassCard intensity={80} variant="default" style={styles.glassCard}>
                        <View style={styles.form}>
                            {/* Language Selector */}
                            <TouchableOpacity style={[styles.languageSelector, { borderColor: theme.border }]}>
                                <Globe color={theme.icon} size={20} />
                                <Text style={[styles.languageText, { color: theme.text }]}>
                                    {language === 'en' ? 'English (US)' : 'Français (FR)'}
                                </Text>
                            </TouchableOpacity>

                            {/* Terms Checkbox */}
                            <View style={styles.termsContainer}>
                                <Checkbox
                                    value={termsAccepted}
                                    onValueChange={setTermsAccepted}
                                    color={termsAccepted ? theme.primary : undefined}
                                    style={styles.checkbox}
                                />
                                <Text style={[styles.termsText, { color: theme.text }]}>
                                    I agree to the <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Terms of Service</Text> and <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Privacy Policy</Text>
                                </Text>
                            </View>

                            <PremiumButton
                                title="Sign In"
                                onPress={() => handleContinue('/(auth)/login')}
                                icon={ArrowRight}
                            />
                            
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => handleContinue('/(auth)/signup')}>
                                <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Create an Account</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </Animated.View>

                {ENABLE_GUEST_MODE && (
                    <Animated.View entering={FadeInUp.delay(600).duration(1000).springify()}>
                        <TouchableOpacity style={styles.guestButton} onPress={handleGuestAccess} disabled={loadingGuest}>
                            <User color={theme.icon} size={18} />
                            <Text style={[styles.guestText, { color: theme.icon }]}>
                                {loadingGuest ? 'Loading...' : 'Continue as Guest'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 6,
        boxShadow: '0px 8px 24px rgba(0,0,0,0.12)',
    },
    logo: {
        width: 48,
        height: 48,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.7,
    },
    glassCard: {
        borderRadius: 24,
        width: '100%',
        padding: 24,
    },
    form: {
        gap: 20,
    },
    languageSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    languageText: {
        fontSize: 16,
        fontWeight: '600',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 20,
        gap: 12,
    },
    checkbox: {
        margin: 4,
        borderRadius: 4,
    },
    termsText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 20,
    },
    secondaryButton: {
        padding: 16,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    guestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginTop: 20,
        gap: 8,
    },
    guestText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
