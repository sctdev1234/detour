import { Calendar, Home, Search, User } from 'lucide-react-native';
import { Platform, useColorScheme } from 'react-native';
import { SwipeableTabs } from '../../components/SwipeableLayout';
import { Colors } from '../../constants/theme';

export default function ClientLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <SwipeableTabs
            tabBarPosition="bottom"
            screenOptions={{
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.icon,
                tabBarStyle: {
                    backgroundColor: theme.background,
                    borderTopColor: theme.border,
                    borderTopWidth: 1,
                    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
                    paddingTop: 8,
                    height: Platform.OS === 'ios' ? 85 : 70, // Increased height for better touch area
                    elevation: 0,
                },
                tabBarIndicatorStyle: {
                    height: 0, // Remove the indicator line standard in top tabs
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    marginTop: 4,
                },
                tabBarShowIcon: true, // Ensure icons are shown
                tabBarContentContainerStyle: {
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                animationEnabled: true,
                swipeEnabled: true,
            }}
        >
            <SwipeableTabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                }}
            />
            <SwipeableTabs.Screen
                name="search"
                options={{
                    title: 'Find Trip',
                    tabBarIcon: ({ color }) => <Search size={24} color={color} />,
                }}
            />
            <SwipeableTabs.Screen
                name="trips"
                options={{
                    title: 'My Trips',
                    tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
                }}
            />
            <SwipeableTabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
            <SwipeableTabs.Screen
                name="request-trip"
                options={{
                    // @ts-ignore
                    href: null,
                }}
            />
            <SwipeableTabs.Screen
                name="edit-profile"
                options={{
                    // @ts-ignore
                    href: null,
                }}
            />
        </SwipeableTabs>
    );
}
