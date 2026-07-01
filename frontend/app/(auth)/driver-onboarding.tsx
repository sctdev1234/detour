import { useUIStore } from '@/store/useUIStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Camera, Car, CreditCard, UserCheck, CheckCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';
import { PremiumButton } from '../../components/PremiumButton';
import { PremiumInput } from '../../components/PremiumInput';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';

export default function DriverOnboardingScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { showToast } = useUIStore();
    const { user, updateUser } = useAuthStore();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Status can be derived from user profile, but using local state for now
    const [status, setStatus] = useState<'draft' | 'pending' | 'approved' | 'rejected'>('draft');
    const [rejectionReason, setRejectionReason] = useState<string | null>('Your ID photo was blurry. Please re-upload.');

    // Form State
    const [formData, setFormData] = useState({
        licenseNumber: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehiclePlate: '',
        bankAccountName: '',
        bankAccountNumber: '',
    });

    const updateForm = (key: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 4));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Send data to backend to update driver application
            // This is a placeholder endpoint
            // await api.post('/auth/driver-application', formData);
            
            showToast('Application submitted successfully', 'success');
            setStatus('pending');
            setStep(4); // Success screen
        } catch (error: any) {
            showToast(error.message || 'Failed to submit application', 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => {
        return (
            <View style={styles.stepIndicatorContainer}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={styles.stepDotContainer}>
                        <View style={[
                            styles.stepDot,
                            { backgroundColor: step >= i ? theme.primary : theme.border },
                            step === i && styles.activeStepDot
                        ]} />
                        {i < 3 && (
                            <View style={[
                                styles.stepLine,
                                { backgroundColor: step > i ? theme.primary : theme.border }
                            ]} />
                        )}
                    </View>
                ))}
            </View>
        );
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                        <View style={styles.stepHeader}>
                            <UserCheck color={theme.primary} size={32} />
                            <Text style={[styles.stepTitle, { color: theme.text }]}>Identity</Text>
                            <Text style={[styles.stepSubtitle, { color: theme.icon }]}>We need to verify who you are.</Text>
                        </View>
                        <GlassCard intensity={80} variant="default" style={styles.formCard}>
                            <PremiumInput
                                label="Driver's License Number"
                                value={formData.licenseNumber}
                                onChangeText={(v) => updateForm('licenseNumber', v)}
                                placeholder="ABC1234567"
                            />
                            <TouchableOpacity style={[styles.uploadBox, { borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                                <Camera color={theme.icon} size={24} />
                                <Text style={[styles.uploadText, { color: theme.icon }]}>Upload Photo ID</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </Animated.View>
                );
            case 2:
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                        <View style={styles.stepHeader}>
                            <Car color={theme.primary} size={32} />
                            <Text style={[styles.stepTitle, { color: theme.text }]}>Vehicle Details</Text>
                            <Text style={[styles.stepSubtitle, { color: theme.icon }]}>Tell us about the car you'll drive.</Text>
                        </View>
                        <GlassCard intensity={80} variant="default" style={styles.formCard}>
                            <PremiumInput
                                label="Make"
                                value={formData.vehicleMake}
                                onChangeText={(v) => updateForm('vehicleMake', v)}
                                placeholder="e.g. Toyota"
                            />
                            <PremiumInput
                                label="Model"
                                value={formData.vehicleModel}
                                onChangeText={(v) => updateForm('vehicleModel', v)}
                                placeholder="e.g. Camry"
                            />
                            <PremiumInput
                                label="Year"
                                value={formData.vehicleYear}
                                onChangeText={(v) => updateForm('vehicleYear', v)}
                                placeholder="e.g. 2022"
                                keyboardType="number-pad"
                            />
                            <PremiumInput
                                label="License Plate"
                                value={formData.vehiclePlate}
                                onChangeText={(v) => updateForm('vehiclePlate', v)}
                                placeholder="e.g. XY-123-Z"
                            />
                        </GlassCard>
                    </Animated.View>
                );
            case 3:
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                        <View style={styles.stepHeader}>
                            <CreditCard color={theme.primary} size={32} />
                            <Text style={[styles.stepTitle, { color: theme.text }]}>Bank Information</Text>
                            <Text style={[styles.stepSubtitle, { color: theme.icon }]}>Where should we send your earnings?</Text>
                        </View>
                        <GlassCard intensity={80} variant="default" style={styles.formCard}>
                            <PremiumInput
                                label="Account Holder Name"
                                value={formData.bankAccountName}
                                onChangeText={(v) => updateForm('bankAccountName', v)}
                                placeholder="John Doe"
                            />
                            <PremiumInput
                                label="Account Number (IBAN)"
                                value={formData.bankAccountNumber}
                                onChangeText={(v) => updateForm('bankAccountNumber', v)}
                                placeholder="MA64 0000..."
                            />
                        </GlassCard>
                    </Animated.View>
                );
            case 4:
                if (status === 'rejected') {
                    return (
                        <Animated.View entering={FadeInUp} style={styles.stepContent}>
                            <View style={[styles.stepHeader, { alignItems: 'center', marginTop: 40 }]}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <CheckCircle color="#ef4444" size={40} /> {/* Should be AlertCircle or XCircle but sticking with what's imported or basic */}
                                </View>
                                <Text style={[styles.stepTitle, { color: theme.text, textAlign: 'center' }]}>Application Needs Update</Text>
                                <Text style={[styles.stepSubtitle, { color: theme.icon, textAlign: 'center', marginTop: 10 }]}>
                                    Your application was reviewed but needs some changes.
                                </Text>
                            </View>
                            <GlassCard intensity={80} variant="default" style={[styles.formCard, { marginTop: 20, borderColor: '#ef4444' }]}>
                                <Text style={{ color: '#ef4444', fontWeight: '600', marginBottom: 8 }}>Rejection Reason:</Text>
                                <Text style={{ color: theme.text }}>{rejectionReason}</Text>
                            </GlassCard>
                            <View style={{ marginTop: 40 }}>
                                <PremiumButton
                                    title="Update Application"
                                    onPress={() => {
                                        setStatus('draft');
                                        setStep(1); // Go back to start to fix it
                                    }}
                                />
                            </View>
                        </Animated.View>
                    );
                }

                return (
                    <Animated.View entering={FadeInUp} style={styles.stepContent}>
                        <View style={[styles.stepHeader, { alignItems: 'center', marginTop: 40 }]}>
                            <CheckCircle color={theme.primary} size={64} style={{ marginBottom: 20 }} />
                            <Text style={[styles.stepTitle, { color: theme.text, textAlign: 'center' }]}>Application Submitted</Text>
                            <Text style={[styles.stepSubtitle, { color: theme.icon, textAlign: 'center', marginTop: 10 }]}>
                                Your application is currently under review. We will notify you once it is approved.
                            </Text>
                        </View>
                        <GlassCard intensity={80} variant="default" style={[styles.formCard, { marginTop: 40 }]}>
                            <PremiumButton
                                title="Go to Dashboard"
                                onPress={() => router.replace('/(driver)/home')}
                            />
                        </GlassCard>
                    </Animated.View>
                );
            default:
                return null;
        }
    };

    return (
        <LinearGradient colors={[theme.background, theme.surface]} style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                {step < 4 && (
                    <View style={styles.topBar}>
                        <TouchableOpacity style={styles.backButton} onPress={step === 1 ? () => router.back() : prevStep}>
                            <ArrowLeft color={theme.text} size={24} />
                        </TouchableOpacity>
                        {renderStepIndicator()}
                        <View style={{ width: 40 }} /> {/* Spacer */}
                    </View>
                )}

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {renderStepContent()}
                </ScrollView>

                {step < 4 && (
                    <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
                        {step < 3 ? (
                            <PremiumButton
                                title="Next Step"
                                onPress={nextStep}
                                icon={ArrowRight}
                            />
                        ) : (
                            <PremiumButton
                                title="Submit Application"
                                onPress={handleSubmit}
                                loading={loading}
                            />
                        )}
                    </View>
                )}
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    stepIndicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepDotContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    activeStepDot: {
        transform: [{ scale: 1.5 }],
    },
    stepLine: {
        width: 20,
        height: 2,
        marginHorizontal: 8,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    stepContent: {
        flex: 1,
    },
    stepHeader: {
        marginBottom: 32,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: '800',
        marginTop: 16,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    formCard: {
        borderRadius: 24,
        padding: 20,
        gap: 16,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    uploadBox: {
        height: 120,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    uploadText: {
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        borderTopWidth: 1,
    },
});
