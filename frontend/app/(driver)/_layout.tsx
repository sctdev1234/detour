import { Redirect } from 'expo-router';
import { Bell, Bookmark, Calendar, Car, Home, MapPin, User } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { Footer } from '../../components/Footer';
import { SwipeableTabs } from '../../components/SwipeableLayout';
import { Colors } from '../../constants/theme';
import { useTrips } from '../../hooks/api/useTripQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { IN_PROGRESS_STATUSES } from '../../utils/timeUtils';

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

    const { data: trips } = useTrips();
    const activeTrip = trips?.find((t: any) =>
        (IN_PROGRESS_STATUSES.includes(t.status) || t.status === 'active') &&
        (t.driverId?._id === user?.id || t.driverId?.id === user?.id || t.driverId === user?.id)
    );

    // If an active trip is found, trap the driver in the live map view.
    if (activeTrip) {
        return <Redirect href={`/modal?type=trip_details&id=${activeTrip.id}`} />;
    }

    return (
        <SwipeableTabs
            tabBarPosition="bottom"
            tabBar={(props) => <Footer {...props} />}
        >
            <SwipeableTabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
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
                name="requests"
                options={{
                    title: 'Requests',
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

            {/* Hidden Screens */}
            <SwipeableTabs.Screen name="add-car" options={{ swipeEnabled: false }} />
            <SwipeableTabs.Screen name="add-route" options={{ swipeEnabled: false }} />
            <SwipeableTabs.Screen name="assign-car" options={{ swipeEnabled: false }} />
            <SwipeableTabs.Screen name="verification" options={{ swipeEnabled: false }} />
            <SwipeableTabs.Screen name="find-clients" options={{ swipeEnabled: false }} />

        </SwipeableTabs>
    );
}
