import SocketService from './socket';

/**
 * Driver-side socket subscriptions for the V2 Dispatch pipeline.
 * Each method returns an unsubscribe function for clean teardown.
 */
export const driverDispatchSocket = {
    /** 
     * Registers a listener for sequence gaps, allowing the action layer to 
     * trigger a recovery API call when events are dropped.
     */
    onSequenceGap: (callback: () => void) => {
        const socket = SocketService.connect();
        // Since we are validating in the wrapper, we don't listen to a specific socket event here,
        // but we'll export a method the action layer can use to bind.
        // Actually, we can dispatch a custom local event or just pass the callback to the wrapper.
        // We will store this globally in this module for the wrappers to use.
        driverDispatchSocket._gapCallback = callback;
        return () => {
            driverDispatchSocket._gapCallback = null;
        };
    },
    
    _gapCallback: null as (() => void) | null,
    
    /** Sequence Validator Wrapper */
    _validateSequence: (data: any, currentSeq: number, callback: (data: any) => void) => {
        if (!data || typeof data.seq !== 'number') {
            // Unsequenced event (V1 or unmigrated)
            callback(data);
            return;
        }
        
        if (data.seq > currentSeq + 1) {
            console.warn(`[DriverSocket] Sequence gap detected! Expected ${currentSeq + 1}, got ${data.seq}. Triggering recovery.`);
            if (driverDispatchSocket._gapCallback) {
                driverDispatchSocket._gapCallback();
            }
            // We still process the event, but the recovery will overwrite state soon.
            callback(data);
        } else if (data.seq <= currentSeq) {
            console.log(`[DriverSocket] Ignored duplicate/old sequence ${data.seq} (Current: ${currentSeq})`);
            // Ignore duplicate
            return;
        } else {
            // Perfect sequence match
            callback(data);
        }
    },

    /** Incoming offer dispatched to this driver. */
    onOfferDispatched: (currentSeq: number, callback: (offer: any) => void) => {
        const socket = SocketService.connect();
        const handler = (data: any) => driverDispatchSocket._validateSequence(data, currentSeq, callback);
        socket.on('dispatch:offer_dispatched', handler);
        return () => socket.off('dispatch:offer_dispatched', handler);
    },

    /** Offer has expired (timeout). */
    onOfferExpired: (currentSeq: number, callback: (data: { offerId: string }) => void) => {
        const socket = SocketService.connect();
        const handler = (data: any) => driverDispatchSocket._validateSequence(data, currentSeq, callback);
        socket.on('dispatch:offer_expired', handler);
        return () => socket.off('dispatch:offer_expired', handler);
    },

    /** Passenger accepted the driver's offer — trip assigned. */
    onTripAssigned: (currentSeq: number, callback: (assignment: any) => void) => {
        const socket = SocketService.connect();
        const handler = (data: any) => driverDispatchSocket._validateSequence(data, currentSeq, callback);
        socket.on('dispatch:trip_assigned_to_driver', handler);
        return () => socket.off('dispatch:trip_assigned_to_driver', handler);
    },

    /** Trip was cancelled by passenger or system. */
    onTripCancelled: (currentSeq: number, callback: (data: { tripInstanceId: string; reason: string }) => void) => {
        const socket = SocketService.connect();
        const handler = (data: any) => driverDispatchSocket._validateSequence(data, currentSeq, callback);
        socket.on('dispatch:trip_cancelled', handler);
        return () => socket.off('dispatch:trip_cancelled', handler);
    },

    /** Passenger counter-offer response. */
    onCounterResponse: (currentSeq: number, callback: (data: { offerId: string; accepted: boolean; finalPrice?: number }) => void) => {
        const socket = SocketService.connect();
        const handler = (data: any) => driverDispatchSocket._validateSequence(data, currentSeq, callback);
        socket.on('dispatch:counter_response', handler);
        return () => socket.off('dispatch:counter_response', handler);
    },

    /** Emit driver location update to backend. */
    emitLocationUpdate: (driverId: string, latitude: number, longitude: number) => {
        const socket = SocketService.getSocket();
        if (socket?.connected) {
            socket.emit('driver_location_update', { driverId, latitude, longitude });
        }
    }
};
