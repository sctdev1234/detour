import { Bell, Calendar, Car, LayoutDashboard, MapPin, User } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { DriverTabBar } from '../../components/DriverTabBar';
import { SwipeableTabs } from '../../components/SwipeableLayout';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function DriverLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { user } = useAuthStore();

    // If driver is not verified, restrict access
    // If driver is not verified, restrict access
    // Verification check temporarily disabled for debugging
    /* 
    if (user?.role === 'driver' && user?.verificationStatus !== 'verified') {
        return (
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="verification" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="index" redirect={true} />
            </Stack>
        );
    }
    */

    return (
        <SwipeableTabs
            tabBarPosition="bottom"
            tabBar={(props) => <DriverTabBar {...props} />}
        >
            <SwipeableTabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
                }}
            />
            <SwipeableTabs.Screen
                name="requests"
                options={{
                    title: 'Requests',
                    tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
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
                name="cars"
                options={{
                    title: 'My Cars',
                    tabBarIcon: ({ color }) => <Car size={24} color={color} />,
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

            {/* Hidden Screens */}
            <SwipeableTabs.Screen name="add-car" options={{ swipeEnabled: false }} />
            <SwipeableTabs.Screen name="add-route" options={{ swipeEnabled: false }} />
            <SwipeableTabs.Screen name="assign-car" options={{ swipeEnabled: false }} />
            <SwipeableTabs.Screen name="verification" options={{ swipeEnabled: false }} />

        </SwipeableTabs>
    );
}
