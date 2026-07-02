import SocketService from './socket';

export const dispatchSocket = {
    /**
     * Subscribes to new offers received for a specific trip instance.
     */
    onOfferReceived: (callback: (offer: any) => void) => {
        const socket = SocketService.connect();
        socket.on('dispatch:offer_received', callback);
        return () => {
            socket.off('dispatch:offer_received', callback);
        };
    },

    /**
     * Subscribes to the driver assigned event (atomic acceptance success).
     */
    onDriverAssigned: (callback: (assignment: any) => void) => {
        const socket = SocketService.connect();
        socket.on('dispatch:driver_assigned', callback);
        return () => {
            socket.off('dispatch:driver_assigned', callback);
        };
    },

    /**
     * Subscribes to state updates (e.g. system is searching for drivers).
     */
    onTripSearching: (callback: (data: any) => void) => {
        const socket = SocketService.connect();
        socket.on('dispatch:trip_searching', callback);
        return () => {
            socket.off('dispatch:trip_searching', callback);
        };
    },

    /**
     * Subscribes to trip status updates (e.g. ARRIVED, STARTED, COMPLETED).
     */
    onTripStatusUpdated: (callback: (data: any) => void) => {
        const socket = SocketService.connect();
        socket.on('dispatch:trip_status_updated', callback);
        return () => {
            socket.off('dispatch:trip_status_updated', callback);
        };
    }
};
