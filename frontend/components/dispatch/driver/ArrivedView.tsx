import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform, TextInput, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Clock, Phone, MessageSquare, KeyRound } from 'lucide-react-native';
import { Colors } from '../../../constants/theme';

interface Props {
    trip: any;
    onStartTrip: (otp?: string) => void;
}

export default function ArrivedView({ trip, onStartTrip }: Props) {
    const [otp, setOtp] = useState('');
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios'
        ? { intensity: 90, tint: colorScheme }
        : {};
    
    const bgColor = colorScheme === 'dark'
        ? 'rgba(28, 28, 30, 0.95)'
        : 'rgba(255, 255, 255, 0.95)';

    const handleStart = () => {
        if (!otp || otp.trim().length !== 4) {
            Alert.alert('Verification Required', 'Please enter the 4-digit boarding PIN provided by the passenger.');
            return;
        }
        onStartTrip(otp.trim());
    };

    return (
        <View style={styles.wrapper}>
            <Container
                {...containerProps}
                style={[styles.container, Platform.OS !== 'ios' && { backgroundColor: bgColor }]}
            >
                <View style={styles.headerRow}>
                    <View style={[styles.waitingBadge]}>
                        <Clock size={18} color="#f59e0b" />
                        <Text style={styles.waitingText}>Waiting for Passenger</Text>
                    </View>
                </View>

                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    You've arrived at the pickup point. Ask the passenger for their 4-digit boarding PIN.
                </Text>

                {/* OTP Input Section */}
                <View style={[styles.otpCard, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7' }]}>
                    <View style={styles.otpHeader}>
                        <KeyRound size={16} color={theme.primary} />
                        <Text style={[styles.otpTitle, { color: theme.text }]}>Enter Passenger Boarding PIN</Text>
                    </View>
                    <TextInput
                        style={[styles.otpInput, { color: theme.text, borderColor: theme.border }]}
                        value={otp}
                        onChangeText={text => setOtp(text.replace(/[^0-9]/g, '').slice(0, 4))}
                        placeholder="••••"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="number-pad"
                        maxLength={4}
                        textAlign="center"
                    />
                </View>

                <View style={styles.contactRow}>
                    <TouchableOpacity
                        style={[styles.contactBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                        activeOpacity={0.7}
                    >
                        <Phone size={20} color="#3b82f6" />
                        <Text style={[styles.contactText, { color: '#3b82f6' }]}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.contactBtn, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}
                        activeOpacity={0.7}
                    >
                        <MessageSquare size={20} color="#8b5cf6" />
                        <Text style={[styles.contactText, { color: '#8b5cf6' }]}>Message</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: otp.length === 4 ? '#10b981' : '#9ca3af' }]}
                    onPress={handleStart}
                    activeOpacity={0.8}
                >
                    <Text style={styles.startText}>VERIFY PIN & START TRIP</Text>
                </TouchableOpacity>
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        paddingBottom: 20,
    },
    container: {
        padding: 24,
        borderRadius: 24,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    headerRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    waitingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    waitingText: {
        color: '#f59e0b',
        fontWeight: '800',
        fontSize: 16,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    otpCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        alignItems: 'center',
    },
    otpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    otpTitle: {
        fontWeight: '700',
        fontSize: 14,
    },
    otpInput: {
        width: 140,
        height: 52,
        borderRadius: 12,
        borderWidth: 1.5,
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 10,
        backgroundColor: 'transparent',
    },
    contactRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    contactText: {
        fontWeight: '800',
        fontSize: 15,
    },
    startButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    startText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    }
});
