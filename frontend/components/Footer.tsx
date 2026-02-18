import { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '../constants/theme';
import { useClientRequests, useDriverRequests } from '../hooks/api/useTripQueries';
import { useAuthStore } from '../store/useAuthStore';

// Define visible routes for each role
const CLIENT_ROUTES = ['index', 'requests', 'routes', 'trips', 'places', 'profile'];
const DRIVER_ROUTES = ['index', 'cars', 'requests', 'routes', 'trips', 'places', 'profile'];

const TabItem = ({ route, index, state, descriptors, navigation, theme, badgeCount, onPressOverride }: {
    route: any, index: number, state: any, descriptors: any, navigation: any, theme: any, badgeCount?: number, onPressOverride?: () => void
}) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const scale = useSharedValue(1);

    React.useEffect(() => {
        if (isFocused) {
            scale.value = withSpring(1.2, { damping: 10, stiffness: 100 });
        } else {
            scale.value = withSpring(1, { damping: 10, stiffness: 100 });
        }
    }, [isFocused]);

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const onPress = () => {
        if (onPressOverride) {
            onPressOverride();
            return;
        }

        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            Haptics.selectionAsync();
            navigation.navigate(route.name, route.params);
        }
    };

    const onLongPress = () => {
        navigation.emit({
            type: 'tabLongPress',
            target: route.key,
        });
    };

    // Get icon from options
    const Icon = options.tabBarIcon;
    const color = isFocused ? theme.primary : theme.icon;

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.7}
        >
            <Animated.View style={[animatedIconStyle, styles.iconContainer]}>
                {Icon && Icon({ focused: isFocused, color })}
                {isFocused && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
                {badgeCount ? (
                    <View style={[styles.badge, { backgroundColor: theme.primary, borderColor: theme.surface }]}>
                        <Text style={{
                            color: '#fff',
                            fontSize: 9,
                            fontWeight: '800',
                            textAlign: 'center',
                            lineHeight: 10 // Adjust line height for vertical centering
                        }}>
                            {badgeCount > 9 ? '9+' : badgeCount}
                        </Text>
                    </View>
                ) : null}
            </Animated.View>
        </TouchableOpacity>
    );
};

export function Footer({ state, descriptors, navigation }: MaterialTopTabBarProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user, role } = useAuthStore();
    // const { unreadReclamation } = useUIStore(); // Deprecated in favor of direct query

    // Notification Logic
    const { data: driverRequests } = useDriverRequests();
    const { data: clientRequests } = useClientRequests();

    // Fetch reclamations to get accurate unread count
    const { useReclamations } = require('../hooks/api/useReclamationQueries');
    const { data: reclamations } = useReclamations();

    // Calculate unread reclamations count
    const unreadReclamationCount = React.useMemo(() => {
        if (!reclamations) return 0;
        return reclamations.filter((r: any) => {
            // Logic must match requests.tsx: unread admin message
            if (r.status === 'resolved') return false;

            const lastMsg = r.messages && r.messages.length > 0 ? r.messages[r.messages.length - 1] : null;
            if (!lastMsg) return false;

            const reporterId = typeof r.reporterId === 'object' ? r.reporterId._id : r.reporterId;
            const senderId = typeof lastMsg.senderId === 'object' ? lastMsg.senderId._id : lastMsg.senderId;

            // Check if message is from admin (not us) and unread
            return String(reporterId) !== String(senderId) && !lastMsg.read;
        }).length;
    }, [reclamations]);

    // Calculate pending notifications based on role
    const notificationCount = React.useMemo(() => {
        if (role === 'driver') {
            return driverRequests?.filter((r: any) => r.status === 'pending').length || 0;
        } else {
            // Clients see "pending offers"
            return clientRequests?.filter((r: any) => r.status === 'pending' && r.initiatedBy === 'driver').length || 0;
        }
    }, [role, driverRequests, clientRequests]);

    // Determine which routes to show based on user role or pathname context if passed
    // But since this component is used inside specific layouts, we might just want to infer based on the routes present
    // OR we can rely on passed props if we need stricer control. 
    // However, the cleanest way is often to just check the route names against our allowlists.

    // Check if we are in client or driver layout context by checking if 'search' (client only) or 'cars' (driver only) exists in state.routes
    // A more robust way is to check the user role from store, AND filter routes that might be permitted.

    let visibleRoutes: string[] = [];

    // Simple heuristic: if the state routes contain 'search', it's likely client structure. If 'cars', driver.
    // Or we can just join both lists if the names don't conflict in a way that shows wrong tabs.
    // The safest is to rely on user role from store.

    if (user?.role === 'driver') {
        visibleRoutes = DRIVER_ROUTES;
    } else {
        // Default to client
        visibleRoutes = CLIENT_ROUTES;
    }

    // EDGE CASE: If a user is not logged in but somehow in these screens (shouldn't happen due to auth guards), 
    // or if the layout has routes that neither list has. 
    // Let's fallback to checking if the route name exists in our combined set of "known tabs".
    // Actually, sticking to role-based filtering is better for security/UX.



    // Filter state routes that are in the visible list for the current role
    const routesToShow = state.routes.filter(route => visibleRoutes.includes(route.name));

    // Hide footer entirely when the active route is a form/hidden screen
    const activeRoute = state.routes[state.index];
    if (activeRoute && !visibleRoutes.includes(activeRoute.name)) {
        return null;
    }

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerStyle = Platform.OS === 'ios'
        ? [styles.container, { backgroundColor: 'transparent' }]
        : [styles.container, { backgroundColor: theme.surface, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: -2 } }];

    return (
        <View style={styles.wrapper}>
            <Container
                intensity={80}
                tint={colorScheme}
                style={containerStyle}
            >
                {routesToShow.map((route, index) => {
                    const realIndex = state.routes.indexOf(route);

                    // Determine badge count
                    let badgeCount: number | undefined = undefined;

                    if (route.name === 'requests') {
                        // Requests tab (Bell icon) gets both trip requests and reclamation notifications
                        const reqCount = notificationCount || 0;
                        const recCount = unreadReclamationCount || 0;
                        const total = reqCount + recCount;
                        if (total > 0) badgeCount = total;
                    }

                    // Removed badge from profile as per user request ("but no... i want it to appear in the notification")

                    return (
                        <TabItem
                            key={route.key}
                            route={route}
                            index={realIndex}
                            state={state}
                            descriptors={descriptors}
                            navigation={navigation}
                            theme={theme}
                            badgeCount={badgeCount}
                        // Removed the onPressOverride for profile since we are moving the notification to the requests tab
                        // The user will see the badge on Requests, click it, go to Requests screen, 
                        // and see the Notification Card at the top (implemented in requests.tsx).
                        />
                    );
                })}
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    container: {
        flexDirection: 'row',
        height: 75, // iOS height
        paddingBottom: 15,
        paddingTop: 5,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -10,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 2
    }
});
