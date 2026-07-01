import { useNetInfo } from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner() {
    const netInfo = useNetInfo();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    
    // Default to true (online) while loading so we don't flash the offline banner unnecessarily
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (netInfo.isConnected === false) {
            setIsOffline(true);
        } else {
            setIsOffline(false);
        }
    }, [netInfo.isConnected]);

    if (!isOffline) return null;

    return (
        <Animated.View
            entering={FadeInUp.springify()}
            exiting={FadeOutUp}
            style={[
                styles.container,
                { paddingTop: Math.max(insets.top, 20) },
                colorScheme === 'dark' ? styles.containerDark : styles.containerLight
            ]}
        >
            <WifiOff size={16} color="#FFF" />
            <Text style={styles.text}>No Internet Connection</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 10,
        paddingHorizontal: 16,
        gap: 8,
    },
    containerLight: {
        backgroundColor: '#FF3B30',
    },
    containerDark: {
        backgroundColor: '#FF453A',
    },
    text: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
