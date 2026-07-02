import { useColorScheme } from 'react-native';
import DrawerContent from '../../components/DrawerContent';
import DriverTripExecutionScreen from '../../components/DriverTripExecutionScreen';
import DriverTripExperienceV2 from '../../components/dispatch/driver/DriverTripExperienceV2';
import { Drawer } from '../../components/DrawerLayout';
import { Colors } from '../../constants/theme';
import { useTrips } from '../../hooks/api/useTripQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { getNextTripOccurrence } from '../../utils/timeUtils';
import { useDriverDispatchStore } from '../../store/useDriverDispatchStore';

export default function DriverLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { featureFlags } = useUIStore();
    const driverV2Status = useDriverDispatchStore((s) => s.status);

    const { data: trips } = useTrips();
    const activeTrip = trips?.find((t: any) => {
        const isDriver = t.driverId?._id === user?.id || t.driverId?.id === user?.id || t.driverId === user?.id;
        if (!isDriver) return false;

        if (['STARTING_SOON', 'STARTED', 'PICKUP_IN_PROGRESS', 'IN_PROGRESS', 'ARRIVED_PICKUP', 'CLIENT_PICKED_UP'].includes(t.status) || t.status === 'active') {
            return true;
        }

        if (t.status === 'CONFIRMED' && t.routeId) {
            const targetDate = getNextTripOccurrence(t.routeId.timeStart, t.routeId.days || []);
            const isWithin10Mins = targetDate ? (targetDate.getTime() - Date.now()) <= 10 * 60 * 1000 : false;
            return isWithin10Mins;
        }

        return false;
    });

    // V2 takes precedence when feature flag is ON and driver is in an active V2 dispatch state
    const isV2Active = featureFlags.enableV2DriverDispatch &&
        ['EN_ROUTE', 'ARRIVED', 'TRIP_ACTIVE', 'TRIP_COMPLETED'].includes(driverV2Status);

    // Hard Lock: V2 active trip takes over
    if (isV2Active) {
        return <DriverTripExperienceV2 />;
    }

    // Hard Lock: V1 active trip takes over (backward compatibility)
    if (activeTrip) {
        return <DriverTripExecutionScreen trip={activeTrip} />;
    }

    return (
        <Drawer
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerType: 'front',
                drawerStyle: {
                    width: 300,
                    backgroundColor: theme.background,
                },
                overlayColor: 'rgba(0,0,0,0.5)',
                swipeEnabled: true,
                swipeEdgeWidth: 50,
            }}
        >
            <Drawer.Screen name="index" options={{ title: 'Dashboard' }} />
            <Drawer.Screen name="cars" options={{ title: 'Cars', swipeEnabled: false }} />
            <Drawer.Screen name="requests" options={{ title: 'Requests', swipeEnabled: false }} />
            <Drawer.Screen name="routes" options={{ title: 'Routes', swipeEnabled: false }} />
            <Drawer.Screen name="trips" options={{ title: 'My Trips', swipeEnabled: false }} />
            <Drawer.Screen name="places" options={{ title: 'Places', swipeEnabled: false }} />
            <Drawer.Screen name="profile" options={{ title: 'Profile', swipeEnabled: false }} />
            
            {/* Form/Hidden Screens */}
            <Drawer.Screen name="add-car" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="add-route" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="assign-car" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="verification" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="find-clients" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="wallet" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="stats" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
        </Drawer>
    );
}
