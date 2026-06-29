import { Bell, Bookmark, Calendar, Home, MapPin, User } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { Footer } from '../../components/Footer';
import { SwipeableTabs } from '../../components/SwipeableLayout';
import { Colors } from '../../constants/theme';

export default function ClientLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <SwipeableTabs
            tabBarPosition="bottom"
            tabBar={(props: any) => <Footer {...props} />}

        >
            <SwipeableTabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                }}
            />

            <SwipeableTabs.Screen
                name="requests"
                options={{
                    title: 'Offers',
                    tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
                }}
            />
            <SwipeableTabs.Screen
                name="places"
                options={{
                    title: 'Places',
                    tabBarIcon: ({ color }) => <Bookmark size={24} color={color} />,
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
            {/* Hidden screens — accessible via navigation but not in tab bar */}
            <SwipeableTabs.Screen
                name="routes"
                options={{
                    // @ts-ignore
                    href: null,
                }}
            />
            <SwipeableTabs.Screen
                name="add-route"
                options={{
                    // @ts-ignore
                    href: null,
                }}
            />
            <SwipeableTabs.Screen
                name="trip-details"
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
