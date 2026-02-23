import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { AlertTriangle, Check, Lock, MessageSquare, Navigation, Phone, User, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Easing, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedRN, { Extrapolate, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useCancelDropoff, useCancelPickup, useCancelTrip, useConfirmDropoff, useConfirmPickup, useDriverArrived, useDriverReady, useFinishTrip, useRemoveClient, useStartTrip } from '../hooks/api/useTripQueries';
import { useLateDuration } from '../hooks/useCountdown';
import SocketService from '../services/socket';
import { useLocationStore } from '../store/useLocationStore';
import { useUIStore } from '../store/useUIStore';
import { getNextTripOccurrence } from '../utils/timeUtils';
import DetourMap from './Map';

export default function DriverTripExecutionScreen({ trip }: { trip: any }) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { showToast, showConfirm, hideGlobalHeader, setHideGlobalHeader } = useUIStore();
    const insets = useSafeAreaInsets();
    const { height: SCREEN_HEIGHT } = useWindowDimensions();

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

    // Cancel modal state
    const [cancelModal, setCancelModal] = useState<{
        visible: boolean;
        title: string;
        subtitle: string;
        reason: string;
        onConfirm: (reason: string) => void;
    }>({ visible: false, title: '', subtitle: '', reason: '', onConfirm: () => { } });

    const closeCancelModal = useCallback(() => {
        setCancelModal(prev => ({ ...prev, visible: false, reason: '' }));
    }, []);

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
                            showToast('You are within 1km of your final destination.', 'info');
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
    }, [trip.status, socket, hasShownDestinationAlert, location]);

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

    const getDistanceAndEta = (target: { latitude: number, longitude: number }) => {
        if (!location?.coords || !target?.latitude) return null;
        const R = 6371e3;
        const lat1 = location.coords.latitude * Math.PI / 180;
        const lat2 = target.latitude * Math.PI / 180;
        const deltaLat = (target.latitude - location.coords.latitude) * Math.PI / 180;
        const deltaLng = (target.longitude - location.coords.longitude) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // meters

        const km = distance / 1000;
        const mins = Math.ceil((km / 30) * 60); // Assuming 30km/h avg speed

        return {
            distanceStr: km < 1 ? `${Math.round(distance)}m` : `${km.toFixed(1)}km`,
            etaStr: `${mins} min`
        };
    };

    const handleStartTrip = async () => {
        setActionLoading(true);
        try {
            await startTrip(trip.id || trip._id);
        } catch (e: any) {
            console.error(e);
            showToast(e.response?.data?.msg || 'Failed to start trip.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleFinishTrip = async () => {
        showConfirm({
            title: 'Finish Trip',
            message: 'Are you sure you want to finish this trip? Ensure all clients have been picked up or dropped off.',
            confirmText: 'Finish Trip',
            cancelText: 'Cancel',
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    await finishTrip(trip.id || trip._id);
                    showToast('Trip completed successfully!', 'success');
                } catch (e: any) {
                    console.error(e);
                    showToast(e.response?.data?.msg || 'Failed to complete trip. You must process all clients first.', 'error');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    // Handle global header visibility
    useEffect(() => {
        setHideGlobalHeader(true);
        return () => setHideGlobalHeader(false);
    }, []);

    const handleDriverReadyState = async () => {
        setActionLoading(true);
        try {
            await driverReady(trip.id || trip._id);
            showToast('You are marked as ready. Waiting for clients or start time.', 'success');
        } catch (e: any) {
            showToast(e.response?.data?.msg || 'Failed to confirm readiness.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const promptCancelTrip = () => {
        setCancelModal({
            visible: true,
            title: 'Cancel Trip',
            subtitle: 'This will cancel the entire trip and affects all clients. Please provide a reason.',
            reason: '',
            onConfirm: async (reason: string) => {
                closeCancelModal();
                setActionLoading(true);
                try {
                    await cancelTrip({ tripId: trip.id || trip._id, reason });
                } catch (e: any) {
                    showToast(e.response?.data?.msg || 'Failed to cancel trip.', 'error');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const handleDriverArrivedBtn = async (clientId: string) => {
        setActionLoading(true);
        try {
            await driverArrived({ tripId: trip.id || trip._id, clientId, driverLocation: getDriverLocationPayload() });
        } catch (e: any) {
            console.error("Arrived Error:", e.response?.data?.msg || e.message);
            showToast(e.response?.data?.msg || 'Could not verify arrival proximity.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmPickup = async (clientId: string) => {
        setActionLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await confirmPickup({ tripId: trip.id || trip._id, clientId, driverLocation: getDriverLocationPayload() });
        } catch (e: any) {
            console.error("Pickup Error:", e.response?.data?.msg || e.message);
            showToast(e.response?.data?.msg || 'Failed to confirm pickup. Check connection or Client Balance.', 'error');
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
            showToast(e.response?.data?.msg || 'Failed to confirm dropoff proximity.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const promptCancelClientAction = (clientId: string, type: 'pickup' | 'dropoff') => {
        const label = type === 'pickup' ? 'Pickup' : 'Dropoff';
        setCancelModal({
            visible: true,
            title: `Cancel ${label}`,
            subtitle: `Please provide a reason for cancelling this client's ${type}.`,
            reason: '',
            onConfirm: async (reason: string) => {
                closeCancelModal();
                setActionLoading(true);
                try {
                    if (type === 'pickup') {
                        await cancelPickup({ tripId: trip.id || trip._id, clientId, reason });
                    } else {
                        await cancelDropoff({ tripId: trip.id || trip._id, clientId, reason });
                    }
                } catch (e: any) {
                    showToast(e.response?.data?.msg || 'Failed to cancel.', 'error');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const isTripActiveOnMap = trip.status === 'STARTED' || trip.status === 'IN_PROGRESS' || trip.status === 'PICKUP_IN_PROGRESS';

    // -- BOTTOM SHEET LOGIC --
    const translateY = useSharedValue(SCREEN_HEIGHT * 0.6);
    const context = useSharedValue({ y: 0 });

    const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.8;
    const SHEET_MIN_HEIGHT = SCREEN_HEIGHT * 0.35;

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = event.translationY + context.value.y;
            translateY.value = Math.max(translateY.value, SCREEN_HEIGHT - SHEET_MAX_HEIGHT);
        })
        .onEnd(() => {
            if (translateY.value > SCREEN_HEIGHT - SHEET_MIN_HEIGHT + 50) {
                translateY.value = withSpring(SCREEN_HEIGHT - SHEET_MIN_HEIGHT, { damping: 15 });
            } else if (translateY.value < SCREEN_HEIGHT - SHEET_MIN_HEIGHT - 50) {
                translateY.value = withSpring(SCREEN_HEIGHT - SHEET_MAX_HEIGHT, { damping: 15 });
            } else {
                translateY.value = withSpring(SCREEN_HEIGHT - SHEET_MIN_HEIGHT, { damping: 15 });
            }
        });

    const rSheetStyle = useAnimatedStyle(() => {
        const borderRadius = interpolate(
            translateY.value,
            [SCREEN_HEIGHT - SHEET_MAX_HEIGHT, SCREEN_HEIGHT - SHEET_MIN_HEIGHT],
            [32, 24],
            Extrapolate.CLAMP
        );
        return {
            transform: [{ translateY: translateY.value }],
            borderRadius,
        };
    });

    const rHandleStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateY.value,
            [SCREEN_HEIGHT - SHEET_MAX_HEIGHT, SCREEN_HEIGHT - SHEET_MIN_HEIGHT + 50],
            [1, 0.5],
            Extrapolate.CLAMP
        );
        return { opacity };
    });

    useEffect(() => {
        translateY.value = withSpring(SCREEN_HEIGHT - SHEET_MIN_HEIGHT, { damping: 15 });
    }, [SCREEN_HEIGHT]);

    // -- RENDERING HELPERS --
    const getTripCTA = () => {
        const clients = trip.clients || [];
        const nextClient = clients.find((c: any) => c.status !== 'DROPPED_OFF');

        if (trip.status === 'STARTING_SOON' && !trip.driverReady) {
            return { label: 'I AM READY', color: ['#8b5cf6', '#7c3aed'], action: handleDriverReadyState, icon: Check };
        }

        if (trip.status !== 'COMPLETED' && trip.status !== 'IN_PROGRESS' && trip.status !== 'STARTED' && trip.status !== 'PICKUP_IN_PROGRESS') {
            return { label: 'START TRIP', color: ['#10b981', '#059669'], action: handleStartTrip, icon: Navigation };
        }

        if (!nextClient) {
            return { label: 'COMPLETE TRIP', color: ['#3b82f6', '#2563eb'], action: handleFinishTrip, icon: Check };
        }

        // Logic based on the next client's status
        if (!nextClient.status || nextClient.status === 'WAITING' || nextClient.status === 'READY') {
            return { label: 'ARRIVE AT PICKUP', color: ['#f59e0b', '#d97706'], action: () => handleDriverArrivedBtn(nextClient.userId._id || nextClient.userId), icon: Navigation };
        }

        if (nextClient.status === 'PICKUP_INCOMING' || trip.status === 'PICKUP_IN_PROGRESS') {
            return { label: 'CONFIRM PICKUP', color: ['#10b981', '#059669'], action: () => handleConfirmPickup(nextClient.userId._id || nextClient.userId), icon: User };
        }

        if (nextClient.status === 'IN_CAR') {
            return { label: 'CONFIRM DROPOFF', color: ['#3b82f6', '#2563eb'], action: () => handleConfirmDropoff(nextClient.userId._id || nextClient.userId), icon: Navigation };
        }

        return { label: 'COMPLETE TRIP', color: ['#3b82f6', '#2563eb'], action: handleFinishTrip, icon: Check };
    };

    const cta = getTripCTA();

    const ScaleButton = ({ children, onPress, disabled, style }: any) => {
        const scale = useSharedValue(1);
        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }]
        }));

        return (
            <GestureDetector
                gesture={Gesture.Tap()
                    .onBegin(() => {
                        scale.value = withTiming(0.95, { duration: 100 });
                    })
                    .onFinalize(() => {
                        scale.value = withTiming(1, { duration: 100 });
                        if (onPress) runOnJS(onPress)();
                    })
                }
            >
                <AnimatedRN.View style={[style, animatedStyle]}>
                    <TouchableOpacity activeOpacity={1} disabled={disabled} onPress={undefined}>
                        {children}
                    </TouchableOpacity>
                </AnimatedRN.View>
            </GestureDetector>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* FULLSCREEN MAP BACKGROUND */}
            <DetourMap
                mode="trip"
                trip={trip}
                theme={theme}
                fullScreen
                style={StyleSheet.absoluteFillObject}
                edgePadding={useMemo(() => ({
                    top: insets.top + (hideGlobalHeader ? 140 : 200),
                    bottom: SHEET_MIN_HEIGHT + 40,
                    left: 40,
                    right: 40
                }), [insets.top, hideGlobalHeader, SHEET_MIN_HEIGHT])}
            />

            <View style={styles.container}>

                {/* STATUS HEADER (Floating Glass Header) */}
                <View style={[styles.floatingHeaderContainer, { top: insets.top + 10 }]}>
                    <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={styles.glassHeader}>
                        <View style={styles.headerRow}>
                            <View style={styles.statusInfo}>
                                <Text style={styles.headerLabel}>TRIP STATUS</Text>
                                <Text style={styles.headerStatus}>
                                    {trip.status === 'STARTING_SOON' ? 'STARTING SOON' : trip.status?.replace('_', ' ') || 'ACTIVE'}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.lockInfo}>
                                <View style={styles.lockBadge}>
                                    <Lock size={12} color="#fff" fill="#fff" />
                                    <Text style={styles.lockLabel}>Locked</Text>
                                </View>
                                {trip.status === 'STARTING_SOON' && scheduledDate && (
                                    <Text style={styles.timerText}>Starts in {lateDuration || '...'}</Text>
                                )}
                            </View>
                        </View>
                    </BlurView>
                </View>

                {isLate && (
                    <View style={[styles.floatingLateBanner, { top: insets.top + 100 }]}>
                        <Animated.View style={[styles.lateBannerContent, { opacity: pulseAnim }]}>
                            <AlertTriangle size={16} color="#fff" />
                            <Text style={styles.lateBannerText}>LATE: {lateDuration}</Text>
                        </Animated.View>
                    </View>
                )}

                {/* FLOATING BOTTOM SHEET */}
                <GestureDetector gesture={gesture}>
                    <AnimatedRN.View style={[styles.bottomSheet, rSheetStyle, { height: SHEET_MAX_HEIGHT }]}>
                        <AnimatedRN.View style={[styles.sheetHandle, rHandleStyle]}>
                            <View style={styles.handleBar} />
                        </AnimatedRN.View>

                        <ScrollView
                            contentContainerStyle={styles.sheetContent}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            <Text style={styles.sectionTitle}>Passengers ({trip.clients?.length || 0})</Text>

                            {trip.clients?.map((client: any, i: number) => {
                                const isPickedUp = client.status === 'IN_CAR';
                                const isDroppedOff = client.status === 'DROPPED_OFF';

                                return (
                                    <View key={i} style={styles.passengerCard}>
                                        <View style={styles.cardHeader}>
                                            <View style={styles.avatarContainer}>
                                                {client.userId?.photoURL ? (
                                                    <Image source={{ uri: client.userId.photoURL }} style={styles.avatar} />
                                                ) : (
                                                    <View style={[styles.avatarPlaceholder, { backgroundColor: '#F0F0F5' }]}>
                                                        <User size={20} color="#A0A0B0" />
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.passengerInfo}>
                                                <Text style={styles.passengerName}>{client.userId?.fullName || 'Passenger'}</Text>
                                                <View style={styles.statusBadgeRow}>
                                                    <View style={[styles.statusBadge, {
                                                        backgroundColor: isDroppedOff ? '#10b98120' : isPickedUp ? '#3b82f620' : '#f59e0b20'
                                                    }]}>
                                                        <Text style={[styles.statusBadgeText, {
                                                            color: isDroppedOff ? '#10b981' : isPickedUp ? '#3b82f6' : '#f59e0b'
                                                        }]}>
                                                            {client.status ? client.status.replace('_', ' ').toUpperCase() : 'WAITING'}</Text>
                                                    </View>
                                                    {(() => {
                                                        const target = isPickedUp ? client.routeId?.endPoint : client.routeId?.startPoint;
                                                        const metrics = target ? getDistanceAndEta(target as any) : null;
                                                        return metrics ? (
                                                            <Text style={styles.metadataText}>{metrics.distanceStr} • {metrics.etaStr}</Text>
                                                        ) : (
                                                            <Text style={styles.metadataText}>Wait...</Text>
                                                        );
                                                    })()}
                                                </View>
                                            </View>
                                            <View style={styles.contactActions}>
                                                <ScaleButton onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)} style={styles.circleActionBtn}>
                                                    <Phone size={18} color="#4F46E5" />
                                                </ScaleButton>
                                                <ScaleButton onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)} style={styles.circleActionBtn}>
                                                    <MessageSquare size={18} color="#4F46E5" />
                                                </ScaleButton>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                            <View style={{ height: 140 }} />
                        </ScrollView>

                        {/* PRIMARY ACTION CTA */}
                        <View style={[styles.ctaContainer, { bottom: insets.bottom + 20 }]}>
                            <ScaleButton onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                cta.action();
                            }} disabled={actionLoading}>
                                <LinearGradient
                                    colors={cta.color as [string, string]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.mainCtaButton}
                                >
                                    {actionLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            {cta.icon && <cta.icon size={22} color="#fff" style={{ marginRight: 8 }} />}
                                            <Text style={styles.ctaText}>{cta.label}</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </ScaleButton>

                            {(trip.status === 'STARTING_SOON' || trip.status === 'STARTED' || isTripActiveOnMap) && (
                                <TouchableOpacity style={styles.emergencyBtn} onPress={promptCancelTrip}>
                                    <Text style={styles.emergencyText}>Emergency / Cancel Trip</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </AnimatedRN.View>
                </GestureDetector>

                {/* Cancel Reason Modal */}
                <Modal
                    visible={cancelModal.visible}
                    transparent
                    animationType="fade"
                    onRequestClose={closeCancelModal}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: theme.text }]}>{cancelModal.title}</Text>
                                <TouchableOpacity onPress={closeCancelModal}>
                                    <X size={22} color={theme.icon} />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.modalSubtitle, { color: theme.icon }]}>{cancelModal.subtitle}</Text>
                            <TextInput
                                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                                placeholder="Enter reason..."
                                placeholderTextColor={theme.icon}
                                value={cancelModal.reason}
                                onChangeText={(text) => setCancelModal(prev => ({ ...prev, reason: text }))}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: theme.border }]}
                                    onPress={closeCancelModal}
                                >
                                    <Text style={[styles.modalBtnText, { color: theme.text }]}>Nevermind</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnDanger, { opacity: cancelModal.reason.trim() ? 1 : 0.5 }]}
                                    onPress={() => {
                                        if (!cancelModal.reason.trim()) return showToast('You must provide a reason.', 'warning');
                                        cancelModal.onConfirm(cancelModal.reason.trim());
                                    }}
                                    disabled={!cancelModal.reason.trim()}
                                >
                                    <Text style={styles.modalBtnText}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    floatingHeaderContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 100,
    },
    glassHeader: {
        borderRadius: 20,
        overflow: 'hidden',
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusInfo: {
        flex: 1,
    },
    headerLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 2,
    },
    headerStatus: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 16,
    },
    lockInfo: {
        alignItems: 'flex-end',
    },
    lockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    lockLabel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    timerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    floatingLateBanner: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 90,
        height: 36,
    },
    lateBannerContent: {
        backgroundColor: '#ef4444',
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        height: '100%',
        gap: 8,
        elevation: 4,
    },
    lateBannerText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        zIndex: 200,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    sheetHandle: {
        height: 30,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    handleBar: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E5E7EB',
    },
    sheetContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#111827',
        marginBottom: 20,
        marginTop: 10,
    },
    passengerCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    passengerInfo: {
        flex: 1,
    },
    passengerName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 4,
    },
    statusBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    metadataText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    contactActions: {
        flexDirection: 'row',
        gap: 8,
    },
    circleActionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardFooter: {
        marginTop: 12,
    },
    ctaContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
    },
    mainCtaButton: {
        height: 64,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    ctaText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    emergencyBtn: {
        alignItems: 'center',
        marginTop: 16,
        padding: 8,
    },
    emergencyText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '700',
    },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { width: '100%', borderRadius: 24, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    modalSubtitle: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
    modalInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 80, marginBottom: 20 },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    modalBtnDanger: { backgroundColor: '#ef4444' },
    modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
