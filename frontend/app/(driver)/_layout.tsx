import { Bell, Car, LayoutDashboard, MapPin, User } from 'lucide-react-native';
import { Platform, useColorScheme } from 'react-native';
import { SwipeableTabs } from '../../components/SwipeableLayout';
import { Colors } from '../../constants/theme';

export default function DriverLayout() {
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
                    height: Platform.OS === 'ios' ? 85 : 70,
                    shadowColor: 'transparent',
                    elevation: 0,
                },
                tabBarIndicatorStyle: {
                    height: 0,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    marginTop: 4,
                },
                tabBarShowIcon: true,
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
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />

            {/* Hidden Screens */}
            {/* <SwipeableTabs.Screen name="add-car" options={{
                // @ts-ignore
                href: null
            }} />
            <SwipeableTabs.Screen name="add-trip" options={{
                // @ts-ignore
                href: null
            }} />
            <SwipeableTabs.Screen name="assign-car" options={{
                // @ts-ignore
                href: null
            }} />
            <SwipeableTabs.Screen name="verification" options={{
                // @ts-ignore
                href: null
            }} /> */}
        </SwipeableTabs>
    );
}
