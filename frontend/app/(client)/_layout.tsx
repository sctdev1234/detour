import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

export default function ClientLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
            }}
        >
            {/* The singular Home OS */}
            <Stack.Screen name="index" />

            {/* Contextual Overlays / Modals */}
            <Stack.Screen
                name="requests"
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen
                name="places"
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen
                name="trips"
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen
                name="profile"
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen
                name="routes"
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen
                name="add-route"
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen
                name="trip-details"
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen
                name="edit-profile"
                options={{ presentation: 'modal' }}
            />
        </Stack>
    );
}
