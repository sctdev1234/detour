import SocketService from './socket';

/**
 * Driver-side socket subscriptions for the V2 Dispatch pipeline.
 * Each method returns an unsubscribe function for clean teardown.
 */
export const driverDispatchSocket = {
    /** Incoming offer dispatched to this driver. */
    onOfferDispatched: (callback: (offer: any) => void) => {
        const socket = SocketService.connect();
        socket.on('dispatch:offer_dispatched', callback);
        return () => {
            socket.off('dispatch:offer_dispatched', callback);
        };
    },

    /** Offer has expired (timeout). */
    onOfferExpired: (callback: (data: { offerId: string }) => void) => {
        const socket = SocketService.connect();
        socket.on('dispatch:offer_expired', callback);
        return () => {
            socket.off('dispatch:offer_expired', callback);
        };
    },

    /** Passenger accepted the driver's offer — trip assigned. */
    onTripAssigned: (callback: (assignment: any) => void) => {
        const socket = SocketService.connect();
        socket.on('dispatch:trip_assigned_to_driver', callback);
        return () => {
            socket.off('dispatch:trip_assigned_to_driver', callback);
        };
    },

    /** Trip was cancelled by passenger or system. */
    onTripCancelled: (callback: (data: { tripInstanceId: string; reason: string }) => void) => {
        const socket = SocketService.connect();
        socket.on('dispatch:trip_cancelled', callback);
        return () => {
            socket.off('dispatch:trip_cancelled', callback);
        };
    },

    /** Passenger counter-offer response. */
    onCounterResponse: (callback: (data: { offerId: string; accepted: boolean; finalPrice?: number }) => void) => {
        const socket = SocketService.connect();
        socket.on('dispatch:counter_response', callback);
        return () => {
            socket.off('dispatch:counter_response', callback);
        };
    },

    /** Emit driver location update to backend. */
    emitLocationUpdate: (driverId: string, latitude: number, longitude: number) => {
        const socket = SocketService.getSocket();
        if (socket?.connected) {
            socket.emit('driver_location_update', { driverId, latitude, longitude });
        }
    }
};
