import { Calendar, Home, MapPin, Search, User } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { ClientTabBar } from '../../components/ClientTabBar';
import { SwipeableTabs } from '../../components/SwipeableLayout';
import { Colors } from '../../constants/theme';

export default function ClientLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <SwipeableTabs
            tabBarPosition="bottom"
            tabBar={(props: any) => <ClientTabBar {...props} />}

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
                name="routes"
                options={{
                    title: 'Routes',
                    tabBarIcon: ({ color }) => <MapPin size={24} color={color} />,
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
