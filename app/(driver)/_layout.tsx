import { Tabs } from 'expo-router';
import { Bell, Car, LayoutDashboard, MapPin, User } from 'lucide-react-native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

export default function DriverLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.icon,
                tabBarStyle: {
                    backgroundColor: theme.background,
                    borderTopColor: theme.border,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                headerStyle: {
                    backgroundColor: theme.background,
                },
                headerTitleStyle: {
                    color: theme.text,
                    fontWeight: '700',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="requests"
                options={{
                    title: 'Requests',
                    tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="cars"
                options={{
                    title: 'Cars',
                    tabBarIcon: ({ color }) => <Car size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="routes"
                options={{
                    title: 'Routes',
                    tabBarIcon: ({ color }) => <MapPin size={24} color={color} />,
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
                name="add-car"
                options={{
                    href: null,
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="add-trip"
                options={{
                    href: null,
                    headerShown: false,
                }}
            />
        </Tabs>
    );
}
