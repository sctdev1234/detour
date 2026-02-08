import { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '../constants/theme';

const TabItem = ({ route, index, state, descriptors, navigation, theme }: {
    route: any, index: number, state: any, descriptors: any, navigation: any, theme: any
}) => {
    const { options } = descriptors[route.key];
    const label =
        options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
                ? options.title
                : route.name;

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
            </Animated.View>
            {/* Optional: Hide label for cleaner look, or keep it small */}
            {/* <Text style={[styles.label, { color }]}>
                {label as string}
            </Text> */}
        </TouchableOpacity>
    );
};

export function ClientTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Define which routes to show and their order
    const visibleRoutes = ['index', 'search', 'routes', 'requests', 'trips', 'profile'];

    // Filter state routes that are in the visible list
    const routesToShow = state.routes.filter(route => visibleRoutes.includes(route.name));

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
                    return (
                        <TabItem
                            key={route.key}
                            route={route}
                            index={realIndex}
                            state={state}
                            descriptors={descriptors}
                            navigation={navigation}
                            theme={theme}
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
    label: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
        marginTop: 4,
    },
});
