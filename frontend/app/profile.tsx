import React from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { Colors } from '../constants/theme';

export default function ProfileRedirect() {
    const { user, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/(auth)/welcome" />;
    }

    const target = user.role === 'driver' ? '/(driver)/profile' : '/(client)/profile';
    return <Redirect href={target as any} />;
}
