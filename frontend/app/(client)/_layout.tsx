import { createMaterialTopTabNavigator, MaterialTopTabNavigationEventMap, MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';
import { Calendar, Home, Search, User } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
    MaterialTopTabNavigationOptions,
    typeof Navigator,
    TabNavigationState<ParamListBase>,
    MaterialTopTabNavigationEventMap
>(Navigator);

export default function ClientLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <MaterialTopTabs
            tabBarPosition="bottom"
            screenOptions={{
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.icon,
                tabBarStyle: {
                    backgroundColor: theme.background,
                    borderTopColor: theme.border,
                    borderTopWidth: 1, // Ensure border is visible
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarIndicatorStyle: {
                    display: 'none', // Hide the indicator for a "bottom tab" look
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                },
                tabBarShowIcon: true,
                swipeEnabled: true,
                animationEnabled: true,
            }}
        >
            <MaterialTopTabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                }}
            />
            <MaterialTopTabs.Screen
                name="search"
                options={{
                    title: 'Find Trip',
                    tabBarIcon: ({ color }) => <Search size={24} color={color} />,
                }}
            />
            <MaterialTopTabs.Screen
                name="trips"
                options={{
                    title: 'My Trips',
                    tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
                }}
            />
            <MaterialTopTabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
            <MaterialTopTabs.Screen
                name="request-trip"
                options={{
                    href: null, // This might not work in MaterialTopTabs directly like in Tabs
                    tabBarItemStyle: { display: 'none' }, // Hide it this way
                }}
            />
        </MaterialTopTabs>
    );
}
