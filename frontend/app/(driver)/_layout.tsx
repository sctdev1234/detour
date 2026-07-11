import { useColorScheme } from 'react-native';
import DrawerContent from '../../components/DrawerContent';
import { Drawer } from '../../components/DrawerLayout';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';

export default function DriverLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

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
            <Drawer.Screen name="routes" options={{ title: 'Routes', swipeEnabled: false }} />
            <Drawer.Screen name="places" options={{ title: 'Places', swipeEnabled: false }} />
            <Drawer.Screen name="profile" options={{ title: 'Profile', swipeEnabled: false }} />
            
            {/* Form/Hidden Screens */}
            <Drawer.Screen name="add-car" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="add-route" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="assign-car" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="verification" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="wallet" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="stats" options={{ swipeEnabled: false, drawerItemStyle: { display: 'none' } }} />
        </Drawer>
    );
}
