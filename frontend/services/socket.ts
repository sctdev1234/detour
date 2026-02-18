import io, { Socket } from 'socket.io-client';

// Use your backend URL here. 
// For Android Emulator, use 10.0.2.2. For physical device, use your machine's IP.
// But since we are using 'localtunnel' or similar in dev, or just standard IP.
// Let's grab the base URL from somewhere or hardcode for dev.
// Ideally this should match the api.ts base URL logic.

import { API_URL } from './apiConfig';

const SOCKET_URL = API_URL.replace('/api', ''); // Remove /api suffix if present to get base URL

class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect(url: string = SOCKET_URL): Socket {
        if (this.socket?.connected) {
            return this.socket;
        }

        this.socket = io(url, {
            transports: ['websocket'],
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        return this.socket;
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    public joinReclamation(reclamationId: string) {
        this.socket?.emit('join_reclamation', reclamationId);
    }

    public leaveReclamation(reclamationId: string) {
        this.socket?.emit('leave_reclamation', reclamationId);
    }

    public joinUserRoom(userId: string) {
        console.log(`[SocketService] Joining user room: user:${userId}`);
        if (!this.socket) {
            console.warn('[SocketService] Socket is null! Cannot join user room.');
            return;
        }
        this.socket.emit('join_user', userId);
    }
}

export default SocketService.getInstance();
