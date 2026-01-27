import { Tabs } from 'expo-router';
import { Calendar, Home, Search, User } from 'lucide-react-native';
import { Platform, useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

export default function ClientLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.icon,
                tabBarStyle: {
                    backgroundColor: theme.background,
                    borderTopColor: theme.border,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 85 : 60, // Taller on iOS for home indicator
                    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Find Trip',
                    tabBarIcon: ({ color }) => <Search size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="trips"
                options={{
                    title: 'My Trips',
                    tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="request-trip"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="edit-profile"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
