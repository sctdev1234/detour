import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle, ChevronRight, Clock, XCircle } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

export default function VerificationStatus({ theme }: { theme: typeof Colors.light }) {
    const { verificationStatus } = useAuthStore();
    const router = useRouter();

    if (verificationStatus === 'verified') {
        return (
            <View style={[styles.container, { backgroundColor: '#4CD96420', borderColor: '#4CD964' }]}>
                <View style={styles.content}>
                    <CheckCircle size={24} color="#4CD964" />
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { color: '#2E8B3D' }]}>Verified Driver</Text>
                        <Text style={[styles.subtitle, { color: theme.icon }]}>You can now accept trips</Text>
                    </View>
                </View>
            </View>
        );
    }

    if (verificationStatus === 'pending') {
        return (
            <View style={[styles.container, { backgroundColor: '#FFCC0020', borderColor: '#FFCC00' }]}>
                <View style={styles.content}>
                    <Clock size={24} color="#E6B800" />
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { color: '#B38F00' }]}>Verification Pending</Text>
                        <Text style={[styles.subtitle, { color: theme.icon }]}>Your documents are being reviewed</Text>
                    </View>
                </View>
            </View>
        );
    }

    if (verificationStatus === 'rejected') {
        return (
            <TouchableOpacity
                style={[styles.container, { backgroundColor: '#FF3B3020', borderColor: '#FF3B30' }]}
                onPress={() => router.push('/(driver)/verification')}
            >
                <View style={styles.content}>
                    <XCircle size={24} color="#FF3B30" />
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { color: '#CC2E25' }]}>Verification Rejected</Text>
                        <Text style={[styles.subtitle, { color: theme.icon }]}>Tap to update details</Text>
                    </View>
                    <ChevronRight size={20} color="#FF3B30" />
                </View>
            </TouchableOpacity>
        );
    }

    // Default: Unverified
    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push('/(driver)/verification')}
        >
            <View style={styles.content}>
                <AlertCircle size={24} color={theme.primary} />
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: theme.text }]}>Verify Account</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>Complete verification to start driving</Text>
                </View>
                <ChevronRight size={20} color={theme.icon} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 13,
    },
});
