import { useState, useEffect } from 'react';
import api from '../services/api';
import { useRideStore, Offer } from '../store/useRideStore';
import { useAuthStore } from '../store/useAuthStore';
import { LatLng } from 'react-native-maps';
import { ToastAndroid, Platform, Alert } from 'react-native';
import socket from '../services/socket';

const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
        Alert.alert('Notification', msg);
    }
};

export const useRideFlow = () => {
    const { 
        status, 
        setRideRequestDetails, 
        addOffer, 
        removeOffer,
        updateSearchRadius, 
        setStatus, 
        reset,
        rideRequestId,
        offers
    } = useRideStore();
    
    const [isLoading, setIsLoading] = useState(false);

    // Setup Socket Listeners
    useEffect(() => {
        if (!socket) return;

        const handleOfferReceived = (offer: Offer) => {
            showToast('New driver offer received!');
            addOffer(offer);
        };

        const handleOfferExpired = (data: { offerId: string }) => {
            removeOffer(data.offerId);
        };

        const handleRideUpdated = (data: { id: string, searchRadius: number }) => {
            if (rideRequestId === data.id) {
                showToast(`Search radius expanded to ${data.searchRadius / 1000}km`);
                updateSearchRadius(data.searchRadius);
            }
        };

        const activeSocket = socket.getSocket();
        if (!activeSocket) return;

        activeSocket.on('offer:received', handleOfferReceived);
        activeSocket.on('offer:expired', handleOfferExpired);
        activeSocket.on('ride:updated', handleRideUpdated);

        return () => {
            activeSocket.off('offer:received', handleOfferReceived);
            activeSocket.off('offer:expired', handleOfferExpired);
            activeSocket.off('ride:updated', handleRideUpdated);
        };
    }, [socket, rideRequestId, addOffer, removeOffer, updateSearchRadius]);

    const requestRide = async (pickup: LatLng, destination: LatLng, pAddr: string, dAddr: string, basePrice: number, distance: number, duration: number) => {
        setIsLoading(true);
        try {
            // 1. Create Draft
            const draftRes = await api.post('/rides/requests', {
                startPoint: { latitude: pickup.latitude, longitude: pickup.longitude, address: pAddr },
                endPoint: { latitude: destination.latitude, longitude: destination.longitude, address: dAddr },
                pricingMetrics: {
                    basePrice,
                    serviceFee: basePrice * 0.1,
                    estimatedDistance: distance,
                    estimatedDuration: duration
                },
                rideType: 'IMMEDIATE'
            });

            const reqId = draftRes.data.data._id;
            
            // 2. Start Search
            await api.patch(`/rides/requests/${reqId}/search`);
            
            setRideRequestDetails(reqId, pickup, destination, pAddr, dAddr, basePrice);
            
            // Analytics
            // posthog.capture('ride_request_initiated', { basePrice, distance });
            
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to request ride');
            setStatus('FAILED');
        } finally {
            setIsLoading(false);
        }
    };

    const cancelSearch = async () => {
        if (!rideRequestId) return;
        setIsLoading(true);
        try {
            await api.delete(`/rides/requests/${rideRequestId}`);
            reset();
            // posthog.capture('ride_cancelled');
        } catch (error) {
            showToast('Failed to cancel request');
        } finally {
            setIsLoading(false);
        }
    };

    const acceptOffer = async (offerId: string) => {
        setIsLoading(true);
        try {
            const res = await api.post(`/rides/offers/${offerId}/accept`);
            setStatus('ACCEPTED');
            // Store the active trip ID in the global trip store
            // useTripStore.getState().setActiveTrip(res.data.data);
            showToast('Ride confirmed! Driver is on the way.');
            // posthog.capture('offer_accepted');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to accept offer');
            // If offer was already accepted by someone else or expired
            removeOffer(offerId);
        } finally {
            setIsLoading(false);
        }
    };

    const rejectOffer = async (offerId: string) => {
        try {
            await api.post(`/rides/offers/${offerId}/reject`);
            removeOffer(offerId);
            // posthog.capture('offer_rejected');
        } catch (error) {
            // Silently fail reject if already expired
            removeOffer(offerId);
        }
    };

    return {
        requestRide,
        cancelSearch,
        acceptOffer,
        rejectOffer,
        isLoading
    };
};
