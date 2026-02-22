import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { AlertTriangle, Check, Navigation, User } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useCancelDropoff, useCancelPickup, useCancelTrip, useConfirmDropoff, useConfirmPickup, useDriverArrived, useDriverReady, useFinishTrip, useRemoveClient, useStartTrip } from '../hooks/api/useTripQueries';
import { useLateDuration } from '../hooks/useCountdown';
import SocketService from '../services/socket';
import { useLocationStore } from '../store/useLocationStore';
import { getNextTripOccurrence } from '../utils/timeUtils';
import DetourMap from './Map';

export default function DriverTripExecutionScreen({ trip }: { trip: any }) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { mutateAsync: startTrip } = useStartTrip();
    const { mutateAsync: finishTrip } = useFinishTrip();
    const { mutateAsync: removeClient } = useRemoveClient();
    const { mutateAsync: confirmPickup } = useConfirmPickup();
    const { mutateAsync: confirmDropoff } = useConfirmDropoff();
    const { mutateAsync: driverArrived } = useDriverArrived();
    const { mutateAsync: driverReady } = useDriverReady();
    const { mutateAsync: cancelTrip } = useCancelTrip();
    const { mutateAsync: cancelPickup } = useCancelPickup();
    const { mutateAsync: cancelDropoff } = useCancelDropoff();

    const { location } = useLocationStore();
    const socket = SocketService.getSocket();
    const [actionLoading, setActionLoading] = useState(false);
    const [hasShownDestinationAlert, setHasShownDestinationAlert] = useState(false);

    // Compute the scheduled start date and late duration
    const scheduledDate = useMemo(() => {
        return getNextTripOccurrence(trip.routeId?.timeStart, trip.routeId?.days || []);
    }, [trip.routeId?.timeStart, trip.routeId?.days]);

    const lateDuration = useLateDuration(scheduledDate);
    const isLate = !!lateDuration && trip.status !== 'STARTED' && trip.status !== 'IN_PROGRESS' && trip.status !== 'PICKUP_IN_PROGRESS' && trip.status !== 'COMPLETED';

    // Pulsing animation for the late banner
    const pulseAnim = useMemo(() => new Animated.Value(1), []);
    useEffect(() => {
        if (!isLate) return;
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [isLate]);

    // Stream driver location to backend for 1km proximity alerts
    useEffect(() => {
        let locationSubscription: Location.LocationSubscription | null = null;
        let isActive = true;

        const startLocationStreaming = async () => {
            if (trip.status !== 'STARTED' && trip.status !== 'IN_PROGRESS' && trip.status !== 'PICKUP_IN_PROGRESS') return;
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            locationSubscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
                (loc) => {
                    if (!isActive || !socket?.connected) return;

                    const lat = loc.coords.latitude;
                    const lng = loc.coords.longitude;

                    socket.emit('driver_location_update', {
                        driverId: trip.driverId._id || trip.driverId,
                        tripId: trip.id || trip._id,
                        latitude: lat,
                        longitude: lng
                    });

                    // Proximity check for final destination
                    if (trip.endPoint?.latitude && trip.endPoint?.longitude && !hasShownDestinationAlert) {
                        const R = 6371e3; // metres
                        const φ1 = lat * Math.PI / 180;
                        const φ2 = trip.endPoint.latitude * Math.PI / 180;
                        const Δφ = (trip.endPoint.latitude - lat) * Math.PI / 180;
                        const Δλ = (trip.endPoint.longitude - lng) * Math.PI / 180;

                        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                            Math.cos(φ1) * Math.cos(φ2) *
                            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const distanceInMeters = R * c;

                        if (distanceInMeters <= 1000) {
                            Alert.alert("Approaching Target", "You are within 1km of your final destination.");
                            setHasShownDestinationAlert(true);
                        }
                    }
                }
            );
        };

        startLocationStreaming();

        return () => {
            isActive = false;
            if (locationSubscription) locationSubscription.remove();
        };
    }, [trip.status, socket]);

    // Hard UI Lock Android Back Button Override
    useEffect(() => {
        const backAction = () => {
            // Block back button entirely
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, []);

    const getDriverLocationPayload = () => {
        if (!location?.coords) return undefined;
        return {
            lat: location.coords.latitude,
            lng: location.coords.longitude
        };
    };

    const handleStartTrip = async () => {
        setActionLoading(true);
        try {
            await startTrip(trip.id || trip._id);
        } catch (e: any) {
            console.error(e);
            Alert.alert("Error", e.response?.data?.msg || "Failed to start trip.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleFinishTrip = async () => {
        Alert.alert(
            "Finish Trip",
            "Are you sure you want to finish this trip? Ensure all clients have been picked up or dropped off.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Finish Trip", style: "default", onPress: async () => {
                        setActionLoading(true);
                        try {
                            await finishTrip(trip.id || trip._id);
                            Alert.alert("Success", "Trip completed successfully.");
                        } catch (e: any) {
                            console.error(e);
                            Alert.alert("Validation Error", e.response?.data?.msg || "Failed to complete trip. You must process all clients first.");
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDriverReadyState = async () => {
        setActionLoading(true);
        try {
            await driverReady(trip.id || trip._id);
            Alert.alert("Success", "You are marked as ready. Waiting for clients or start time.");
        } catch (e: any) {
            Alert.alert("Error", e.response?.data?.msg || "Failed to confirm readiness.");
        } finally {
            setActionLoading(false);
        }
    };

    const promptCancelTrip = () => {
        Alert.prompt(
            "Cancel Trip",
            "Are you sure you want to cancel this entire trip? This affects all clients. Please provide a reason.",
            [
                { text: "Nevermind", style: "cancel" },
                {
                    text: "Cancel Trip",
                    style: "destructive",
                    onPress: async (reason?: string) => {
                        if (!reason) return Alert.alert("Required", "You must provide a cancellation reason.");
                        setActionLoading(true);
                        try {
                            await cancelTrip({ tripId: trip.id || trip._id, reason });
                        } catch (e: any) {
                            Alert.alert("Error", e.response?.data?.msg || "Failed to cancel trip.");
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ],
            "plain-text"
        );
    };

    const handleDriverArrivedBtn = async (clientId: string) => {
        setActionLoading(true);
        try {
            await driverArrived({ tripId: trip.id || trip._id, clientId, driverLocation: getDriverLocationPayload() });
        } catch (e: any) {
            console.error("Arrived Error:", e.response?.data?.msg || e.message);
            Alert.alert('GPS Validation Error', e.response?.data?.msg || 'Could not verify arrival proximity.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmPickup = async (clientId: string) => {
        setActionLoading(true);
        try {
            await confirmPickup({ tripId: trip.id || trip._id, clientId, driverLocation: getDriverLocationPayload() });
        } catch (e: any) {
            console.error("Pickup Error:", e.response?.data?.msg || e.message);
            Alert.alert('Pickup/Financial Error', e.response?.data?.msg || 'Failed to confirm pickup. Please check connection or Client Balance.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmDropoff = async (clientId: string) => {
        setActionLoading(true);
        try {
            await confirmDropoff({ tripId: trip.id || trip._id, clientId, driverLocation: getDriverLocationPayload() });
        } catch (e: any) {
            console.error("Dropoff Error:", e.response?.data?.msg || e.message);
            Alert.alert('GPS Validation Error', e.response?.data?.msg || 'Failed to confirm dropoff proximity.');
        } finally {
            setActionLoading(false);
        }
    };

    const promptCancelClientAction = (clientId: string, type: 'pickup' | 'dropoff') => {
        Alert.prompt(
            `Cancel ${type === 'pickup' ? 'Pickup' : 'Dropoff'}`,
            `Please state a reason for cancelling this client's ${type}:`,
            [
                { text: "Nevermind", style: "cancel" },
                {
                    text: `Cancel ${type === 'pickup' ? 'Pickup' : 'Dropoff'}`,
                    style: "destructive",
                    onPress: async (reason?: string) => {
                        if (!reason) return Alert.alert("Required", "You must provide a cancellation reason.");
                        setActionLoading(true);
                        try {
                            if (type === 'pickup') {
                                await cancelPickup({ tripId: trip.id || trip._id, clientId, reason });
                            } else {
                                await cancelDropoff({ tripId: trip.id || trip._id, clientId, reason });
                            }
                        } catch (e: any) {
                            Alert.alert("Error", e.response?.data?.msg || "Failed to cancel.");
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ],
            "plain-text"
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>ACTIVE TRIP EXECUTION</Text>
            </View>

            <View style={[styles.statusBanner, {
                backgroundColor: trip.status === 'STARTED' || trip.status === 'IN_PROGRESS' || trip.status === 'PICKUP_IN_PROGRESS' ? '#10b981' : trip.status === 'STARTING_SOON' ? '#8b5cf6' : '#f59e0b'
            }]}>
                <Text style={styles.statusText}>{trip.status ? trip.status.toUpperCase() : 'PENDING'} • HARD LOCKED UI</Text>
            </View>

            {isLate && (
                <Animated.View style={[styles.lateBanner, { opacity: pulseAnim }]}>
                    <AlertTriangle size={20} color="#fff" />
                    <Text style={styles.lateText}>{lateDuration}</Text>
                    <Text style={styles.lateSubText}>You should have started already!</Text>
                </Animated.View>
            )}

            <View style={{ flex: 1 }}>
                <DetourMap mode="trip" trip={trip} theme={theme} />
            </View>

            <ScrollView contentContainerStyle={styles.content} style={{ flex: 1, borderTopWidth: 2, borderColor: theme.border }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Passengers ({trip.clients?.length || 0})</Text>
                {trip.clients?.map((client: any, i: number) => (
                    <View key={i} style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 }}>
                            {client.userId?.photoURL ? (
                                <Image source={{ uri: client.userId.photoURL }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: theme.border }]}>
                                    <User size={20} color={theme.icon} />
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.userName, { color: theme.text }]}>{client.userId?.fullName || 'Client'}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[styles.userRole, { color: theme.icon }]}>Passenger</Text>
                                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: client.status === 'PICKED_UP' ? '#3b82f620' : client.status === 'DROPPED_OFF' ? '#10b98120' : '#f59e0b20' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: client.status === 'PICKED_UP' ? '#3b82f6' : client.status === 'DROPPED_OFF' ? '#10b981' : '#f59e0b' }}>
                                            {client.status ? client.status.toUpperCase() : 'WAITING'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {client.status !== 'DROPPED_OFF' && (
                            <View style={{ flexDirection: 'row', width: '100%', marginTop: 12, gap: 8 }}>
                                {(!client.status || client.status === 'WAITING' || client.status === 'READY') && trip.status !== 'PICKUP_IN_PROGRESS' && (
                                    <TouchableOpacity
                                        style={[styles.actionBtnSmall, { backgroundColor: '#f59e0b' }]}
                                        onPress={() => handleDriverArrivedBtn(client.userId._id || client.userId)}
                                        disabled={actionLoading}
                                    >
                                        <Text style={styles.actionBtnTextSmall}>Arrive at Pickup</Text>
                                    </TouchableOpacity>
                                )}

                                {(trip.status === 'PICKUP_IN_PROGRESS' || client.status === 'PICKUP_INCOMING') && client.status !== 'IN_CAR' && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.actionBtnSmall, { backgroundColor: '#3b82f6', flex: 1 }]}
                                            onPress={() => handleConfirmPickup(client.userId._id || client.userId)}
                                            disabled={actionLoading}
                                        >
                                            <Text style={styles.actionBtnTextSmall}>Confirm Pickup</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtnSmall, { backgroundColor: '#ef4444', marginLeft: 8, paddingHorizontal: 16 }]}
                                            onPress={() => promptCancelClientAction(client.userId._id || client.userId, 'pickup')}
                                            disabled={actionLoading}
                                        >
                                            <Text style={styles.actionBtnTextSmall}>Cancel</Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {client.status === 'IN_CAR' && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.actionBtnSmall, { backgroundColor: '#10b981', flex: 1 }]}
                                            onPress={() => handleConfirmDropoff(client.userId._id || client.userId)}
                                            disabled={actionLoading}
                                        >
                                            <Text style={styles.actionBtnTextSmall}>Confirm Dropoff</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtnSmall, { backgroundColor: '#ef4444', marginLeft: 8, paddingHorizontal: 16 }]}
                                            onPress={() => promptCancelClientAction(client.userId._id || client.userId, 'dropoff')}
                                            disabled={actionLoading}
                                        >
                                            <Text style={styles.actionBtnTextSmall}>Cancel</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                {trip.status === 'STARTING_SOON' && !trip.driverReady ? (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
                        onPress={handleDriverReadyState}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Check size={20} color="#fff" />
                                <Text style={styles.btnText}>I Am Ready</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : trip.status !== 'COMPLETED' && trip.status !== 'IN_PROGRESS' && trip.status !== 'STARTED' && trip.status !== 'PICKUP_IN_PROGRESS' ? (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                        onPress={handleStartTrip}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Navigation size={20} color="#fff" />
                                <Text style={styles.btnText}>Start Trip</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
                        onPress={handleFinishTrip}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Check size={20} color="#fff" />
                                <Text style={styles.btnText}>Complete Trip</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {(trip.status === 'STARTING_SOON' || trip.status === 'STARTED') && (
                    <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={promptCancelTrip}>
                        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Cancel Trip (Emergency)</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingTop: 40, alignItems: 'center', backgroundColor: '#ef4444' },
    title: { fontSize: 18, fontWeight: '900', color: '#fff' },
    lateBanner: { backgroundColor: '#dc2626', paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
    lateText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    lateSubText: { color: '#fecaca', fontSize: 12, fontWeight: '600', width: '100%', textAlign: 'center' },
    statusBanner: { padding: 10, alignItems: 'center', justifyContent: 'center' },
    statusText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    content: { padding: 20, paddingBottom: 100 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
    userCard: { padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 10, flexDirection: 'column', gap: 10 },
    avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    userName: { fontSize: 16, fontWeight: '800' },
    userRole: { fontSize: 13 },
    actionBtnSmall: { flex: 1, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    actionBtnTextSmall: { color: '#fff', fontSize: 14, fontWeight: '800' },
    footer: { padding: 20, position: 'absolute', bottom: 0, left: 0, right: 0 },
    actionBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
