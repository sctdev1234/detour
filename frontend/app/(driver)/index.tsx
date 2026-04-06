import { DrawerActions, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import DashboardScreen from '../../components/dashboard/DashboardScreen';
import { useUIStore } from '../../store/useUIStore';

export default function DriverDashboard() {
    const navigation = useNavigation();
    const colorScheme = useColorScheme() ?? 'light';
    const { setHideGlobalHeader } = useUIStore();

    // Hide global header on the dashboard — we use our own floating UI
    useEffect(() => {
        setHideGlobalHeader(true);
        return () => setHideGlobalHeader(false);
    }, []);

    const handleMenuPress = useCallback(() => {
        navigation.dispatch(DrawerActions.openDrawer());
    }, [navigation]);

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                translucent
                backgroundColor="transparent"
            />
            <DashboardScreen onMenuPress={handleMenuPress} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
