import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LatLng } from './useTripStore';

export interface ClientRequest {
    id: string;
    clientId: string;
    driverTripId?: string; // If requesting a specific driver's trip
    startPoint: LatLng;
    endPoint: LatLng;
    preferredTime: string;
    days: string[];
    proposedPrice: number;
    status: 'pending' | 'accepted' | 'declined' | 'completed' | 'started';
    createdAt: number;
}

interface ClientRequestState {
    requests: ClientRequest[];
    addRequest: (request: Omit<ClientRequest, 'id' | 'clientId' | 'status' | 'createdAt'>) => void;
    removeRequest: (id: string) => void;
    updateRequestStatus: (id: string, status: ClientRequest['status']) => void;
}

export const useClientRequestStore = create<ClientRequestState>()(
    persist(
        (set) => ({
            requests: [],
            addRequest: (requestData) => set((state) => {
                const id = Math.random().toString(36).substring(7);
                const newRequest: ClientRequest = {
                    ...requestData,
                    id,
                    clientId: 'me', // Placeholder
                    status: 'pending',
                    createdAt: Date.now(),
                };
                return { requests: [...state.requests, newRequest] };
            }),
            removeRequest: (id) => set((state) => ({
                requests: state.requests.filter((r) => r.id !== id),
            })),
            updateRequestStatus: (id, status) => set((state) => {
                const updatedRequests = state.requests.map((r) => {
                    if (r.id === id) {
                        // Trigger notification for status changes
                        if (r.status !== status) {
                            import('../services/notificationService').then(({ sendImmediateNotification, scheduleTripReminder }) => {
                                const statusUpper = status.charAt(0).toUpperCase() + status.slice(1);
                                sendImmediateNotification('Trip Update', `Your trip request is now ${statusUpper}`);

                                if (status === 'accepted') {
                                    scheduleTripReminder(r.id, r.preferredTime, 'Daily Commute', 30);
                                    scheduleTripReminder(r.id, r.preferredTime, 'Daily Commute', 5);
                                }

                                if (status === 'started') {
                                    sendImmediateNotification('Driver on the way', `${r.driverTripId ? 'Your driver' : 'Driver'} has started the trip and is on the way!`);
                                }
                            });
                        }
                        return { ...r, status };
                    }
                    return r;
                });
                return { requests: updatedRequests };
            }),
        }),
        {
            name: 'client-request-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
