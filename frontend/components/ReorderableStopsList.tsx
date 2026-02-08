import { ArrowDown, ArrowUp, GripVertical, MapPin, Navigation, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface StopItem {
    id: string;
    type: 'driver_start' | 'pickup' | 'waypoint' | 'dropoff' | 'driver_end';
    latitude: number;
    longitude: number;
    address?: string;
    clientName?: string;
    clientIndex?: number;
    isFixed?: boolean; // Driver start/end are fixed
}

interface ReorderableStopsListProps {
    stops: StopItem[];
    onReorder: (stops: StopItem[]) => void;
    theme: any;
    editable?: boolean;
}

export default function ReorderableStopsList({
    stops,
    onReorder,
    theme,
    editable = true
}: ReorderableStopsListProps) {

    const moveUp = (index: number) => {
        if (index <= 1) return; // Can't move above driver start or to position 0
        const newStops = [...stops];
        [newStops[index - 1], newStops[index]] = [newStops[index], newStops[index - 1]];
        onReorder(newStops);
    };

    const moveDown = (index: number) => {
        if (index >= stops.length - 2) return; // Can't move below driver end
        const newStops = [...stops];
        [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
        onReorder(newStops);
    };

    const getStopIcon = (type: StopItem['type']) => {
        switch (type) {
            case 'driver_start':
                return <Navigation size={16} color="#fff" />;
            case 'driver_end':
                return <MapPin size={16} color="#fff" />;
            case 'pickup':
                return <User size={14} color="#fff" />;
            case 'dropoff':
                return <MapPin size={14} color="#fff" />;
            case 'waypoint':
                return <View style={styles.waypointDot} />;
            default:
                return null;
        }
    };

    const getStopColor = (type: StopItem['type']) => {
        switch (type) {
            case 'driver_start':
                return '#10b981';
            case 'driver_end':
                return '#ef4444';
            case 'pickup':
                return '#6366f1';
            case 'dropoff':
                return '#8b5cf6';
            case 'waypoint':
                return theme.primary;
            default:
                return theme.icon;
        }
    };

    const getStopLabel = (stop: StopItem, index: number) => {
        switch (stop.type) {
            case 'driver_start':
                return 'Start';
            case 'driver_end':
                return 'Destination';
            case 'pickup':
                return `Pick up${stop.clientName ? `: ${stop.clientName}` : ''}`;
            case 'dropoff':
                return `Drop off${stop.clientName ? `: ${stop.clientName}` : ''}`;
            case 'waypoint':
                return `Waypoint`;
            default:
                return `Stop ${index}`;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Route Order</Text>
                {editable && (
                    <Text style={[styles.headerSubtitle, { color: theme.icon }]}>
                        Use arrows to reorder
                    </Text>
                )}
            </View>

            {stops.map((stop, index) => {
                const isFirst = index === 0;
                const isLast = index === stops.length - 1;
                const canMoveUp = !isFirst && !stop.isFixed && index > 1;
                const canMoveDown = !isLast && !stop.isFixed && index < stops.length - 2;

                return (
                    <View key={stop.id} style={styles.stopRow}>
                        {/* Connector Line */}
                        {!isFirst && (
                            <View style={[styles.connectorLine, { backgroundColor: theme.border }]} />
                        )}

                        {/* Stop Item */}
                        <View style={[styles.stopItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            {/* Icon */}
                            <View style={[styles.stopIcon, { backgroundColor: getStopColor(stop.type) }]}>
                                {getStopIcon(stop.type)}
                            </View>

                            {/* Info */}
                            <View style={styles.stopInfo}>
                                <Text style={[styles.stopLabel, { color: theme.text }]}>
                                    {getStopLabel(stop, index)}
                                </Text>
                                {stop.address && (
                                    <Text style={[styles.stopAddress, { color: theme.icon }]} numberOfLines={1}>
                                        {stop.address.split(',')[0]}
                                    </Text>
                                )}
                            </View>

                            {/* Reorder Buttons */}
                            {editable && !stop.isFixed && (
                                <View style={styles.reorderButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.arrowBtn,
                                            { backgroundColor: canMoveUp ? theme.primary + '20' : 'transparent' }
                                        ]}
                                        onPress={() => moveUp(index)}
                                        disabled={!canMoveUp}
                                    >
                                        <ArrowUp size={18} color={canMoveUp ? theme.primary : theme.border} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.arrowBtn,
                                            { backgroundColor: canMoveDown ? theme.primary + '20' : 'transparent' }
                                        ]}
                                        onPress={() => moveDown(index)}
                                        disabled={!canMoveDown}
                                    >
                                        <ArrowDown size={18} color={canMoveDown ? theme.primary : theme.border} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Fixed indicator */}
                            {stop.isFixed && (
                                <View style={styles.fixedBadge}>
                                    <GripVertical size={16} color={theme.border} />
                                </View>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 12,
    },
    stopRow: {
        position: 'relative',
    },
    connectorLine: {
        position: 'absolute',
        left: 19,
        top: -8,
        width: 2,
        height: 8,
    },
    stopItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        gap: 12,
    },
    stopIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopInfo: {
        flex: 1,
    },
    stopLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    stopAddress: {
        fontSize: 12,
        marginTop: 2,
    },
    reorderButtons: {
        flexDirection: 'row',
        gap: 4,
    },
    arrowBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fixedBadge: {
        opacity: 0.5,
    },
    waypointDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
});
