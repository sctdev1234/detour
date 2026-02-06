import { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../constants/theme';

export function ClientTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Define which routes to show and their order
    const visibleRoutes = ['index', 'search', 'trips', 'profile'];

    // Filter state routes that are in the visible list
    const routesToShow = state.routes.filter(route => visibleRoutes.includes(route.name));

    return (
        <View style={[styles.container, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            {routesToShow.map((route, index) => {
                const { options } = descriptors[route.key];
                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === state.routes.indexOf(route);

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
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
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={styles.tabItem}
                    >
                        {Icon && Icon({ focused: isFocused, color })}
                        <Text style={[styles.label, { color }]}>
                            {label as string}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 85, // iOS height
        paddingBottom: 25,
        paddingTop: 10,
        borderTopWidth: 1,
        elevation: 0,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
});
