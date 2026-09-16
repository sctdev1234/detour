import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Dimensions
} from 'react-native';
import { Plus, Navigation, Clock, MapPin } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { Colors } from '../../constants/theme';
import { Route } from '../../types';

interface DriverRouteSelectorProps {
    routes: Route[];
    selectedRouteId: string | null;
    onSelectRoute: (routeId: string) => void;
    onCreateRoute: () => void;
}

export const DriverRouteSelector: React.FC<DriverRouteSelectorProps> = ({
    routes,
    selectedRouteId,
    onSelectRoute,
    onCreateRoute
}) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    // Zero Routes State
    if (routes.length === 0) {
        return (
            <View style={[
                styles.emptyContainer,
                {
                    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
                }
            ]}>
                <View style={[styles.emptyIconBox, { backgroundColor: theme.primary + '15' }]}>
                    <Navigation size={22} color={theme.primary} />
                </View>
                <View style={styles.emptyContent}>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No routes added yet</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                        Add a route to start driving and discovering passengers.
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.emptyAddBtn, { backgroundColor: theme.primary }]}
                    onPress={onCreateRoute}
                    activeOpacity={0.8}
                >
                    <Plus size={16} color="#fff" />
                    <Text style={styles.emptyAddBtnText}>Add Route</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // 1+ Routes State
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                snapToInterval={SCREEN_WIDTH * 0.7 + 10} // card width + gap
                decelerationRate="fast"
            >

                {/* Route Chips */}
                {routes.map((route) => {
                    const routeId = route.id || (route as any)._id;
                    const isSelected = selectedRouteId === routeId;
                    const startCity = (route.startPoint?.address || 'Start').split(',')[0].trim();
                    const endCity = (route.endPoint?.address || 'End').split(',')[0].trim();
                    const time = route.timeStart || (route as any).schedule?.time;

                    return (
                        <TouchableOpacity
                            key={routeId}
                            style={[
                                styles.routeChip,
                                {
                                    backgroundColor: isSelected
                                        ? theme.primary
                                        : isDark
                                            ? 'rgba(28, 28, 30, 0.95)'
                                            : 'rgba(255, 255, 255, 0.95)',
                                    borderColor: isSelected
                                        ? theme.primary
                                        : isDark
                                            ? 'rgba(255, 255, 255, 0.12)'
                                            : 'rgba(0, 0, 0, 0.08)'
                                },
                                isSelected && styles.selectedChipShadow
                            ]}
                            onPress={() => onSelectRoute(routeId)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.routeChipTop}>
                                <View style={[
                                    styles.routeDot,
                                    { backgroundColor: isSelected ? '#fff' : '#10b981' }
                                ]} />
                                <Text
                                    style={[
                                        styles.routeText,
                                        { color: isSelected ? '#fff' : theme.text }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {startCity} → {endCity}
                                </Text>
                            </View>

                            {time ? (
                                <View style={styles.routeChipBottom}>
                                    <Clock size={11} color={isSelected ? 'rgba(255,255,255,0.85)' : theme.textSecondary} />
                                    <Text
                                        style={[
                                            styles.timeText,
                                            { color: isSelected ? 'rgba(255,255,255,0.85)' : theme.textSecondary }
                                        ]}
                                    >
                                        {time}
                                    </Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: 8,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 10,
        alignItems: 'center',
    },
    routeChip: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18,
        borderWidth: 1,
        gap: 6,
        width: SCREEN_WIDTH * 0.7,
    },
    selectedChipShadow: {
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },
    routeChipTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    routeDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    routeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    routeChipBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 13,
    },
    timeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    // Empty state
    emptyContainer: {
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    emptyIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContent: {
        flex: 1,
        gap: 2,
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    emptySubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    emptyAddBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});
