import { AppState, AppStateStatus } from 'react-native';
import SocketService from './socket';

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECTING';

interface LifecycleConfig {
    heartbeatIntervalMs: number;
    reconnectIntervalMs: number;
}

const DEFAULT_CONFIG: LifecycleConfig = {
    heartbeatIntervalMs: Number(process.env.EXPO_PUBLIC_SOCKET_HEARTBEAT_MS) || 15000,
    reconnectIntervalMs: Number(process.env.EXPO_PUBLIC_SOCKET_RECONNECT_MS) || 5000,
};

type StatusListener = (status: ConnectionStatus) => void;
type ResumeListener = () => void;

class SocketLifecycleManager {
    private appState: AppStateStatus = AppState.currentState;
    private config: LifecycleConfig;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private reconnectInterval: ReturnType<typeof setInterval> | null = null;
    
    private statusListeners: Set<StatusListener> = new Set();
    private resumeListeners: Set<ResumeListener> = new Set();
    
    private currentStatus: ConnectionStatus = 'DISCONNECTED';

    constructor(config: Partial<LifecycleConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        AppState.addEventListener('change', this.handleAppStateChange);
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        const socket = SocketService.getSocket();
        if (!socket) return;

        socket.on('connect', () => {
            this.updateStatus('CONNECTED');
            this.startHeartbeat();
            this.stopReconnectInterval();
        });

        socket.on('disconnect', (reason) => {
            this.updateStatus('DISCONNECTED');
            this.stopHeartbeat();
            
            // Auto reconnect if it wasn't a deliberate close
            if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
                this.updateStatus('RECONNECTING');
                this.startReconnectInterval();
            }
        });
        
        socket.on('connect_error', () => {
            this.updateStatus('DISCONNECTED');
            this.startReconnectInterval();
        });
    }

    public start() {
        this.updateStatus('CONNECTING');
        const socket = SocketService.connect();
        // Socket listeners might not be attached if socket was just created
        if (socket.connected) {
            this.updateStatus('CONNECTED');
            this.startHeartbeat();
        } else {
            this.setupSocketListeners();
        }
    }

    public stop() {
        this.stopHeartbeat();
        this.stopReconnectInterval();
        SocketService.disconnect();
        this.updateStatus('DISCONNECTED');
    }

    public addStatusListener(listener: StatusListener) {
        this.statusListeners.add(listener);
        listener(this.currentStatus);
        return () => this.statusListeners.delete(listener);
    }

    public addResumeListener(listener: ResumeListener) {
        this.resumeListeners.add(listener);
        return () => this.resumeListeners.delete(listener);
    }

    private updateStatus(status: ConnectionStatus) {
        if (this.currentStatus === status) return;
        this.currentStatus = status;
        this.statusListeners.forEach(l => l(status));
    }

    private handleAppStateChange = (nextAppState: AppStateStatus) => {
        const wentForeground = this.appState.match(/inactive|background/) && nextAppState === 'active';
        const wentBackground = this.appState === 'active' && nextAppState.match(/inactive|background/);
        
        this.appState = nextAppState;

        if (wentForeground) {
            this.onForeground();
        } else if (wentBackground) {
            this.onBackground();
        }
    };

    private onForeground() {
        // Force reconnect if needed
        const socket = SocketService.getSocket();
        if (!socket || !socket.connected) {
            this.start();
        } else {
            this.startHeartbeat();
        }

        // Notify listeners to sync state
        this.resumeListeners.forEach(l => l());
    }

    private onBackground() {
        this.stopHeartbeat();
        // Depending on OS, we might want to let the socket naturally die or close it.
        // For mobile, we explicitly disconnect to avoid silent drops.
        this.stop();
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            const socket = SocketService.getSocket();
            if (socket && socket.connected) {
                socket.emit('heartbeat', { timestamp: Date.now() });
            }
        }, this.config.heartbeatIntervalMs);
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private startReconnectInterval() {
        if (this.reconnectInterval) return;
        
        this.reconnectInterval = setInterval(() => {
            if (this.appState === 'active') {
                this.updateStatus('RECONNECTING');
                const socket = SocketService.connect();
                if (!socket.connected) {
                    socket.connect();
                }
            }
        }, this.config.reconnectIntervalMs);
    }

    private stopReconnectInterval() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }
}

export const socketLifecycleManager = new SocketLifecycleManager();
