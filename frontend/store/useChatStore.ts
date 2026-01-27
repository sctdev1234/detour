import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: number;
}

export interface Conversation {
    id: string; // TypicallyrequestId
    messages: Message[];
}

interface ChatState {
    conversations: Record<string, Conversation>;
    addMessage: (requestId: string, senderId: string, text: string) => void;
    getConversation: (requestId: string) => Conversation | undefined;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            conversations: {},
            addMessage: (requestId, senderId, text) => {
                const newMessage: Message = {
                    id: Math.random().toString(36).substring(7),
                    senderId,
                    text,
                    createdAt: Date.now(),
                };

                // Trigger notification if message is from another user
                // In a real app, this logic would be on the server
                // We're simulating it here by checking if senderId is NOT "me"
                // (which is used as placeholder in current request store for client)
                if (senderId !== 'me') {
                    import('../services/notificationService').then(({ sendImmediateNotification }) => {
                        sendImmediateNotification('New Message', text, { requestId });
                    });
                }

                set((state) => {
                    const conversation = state.conversations[requestId] || { id: requestId, messages: [] };
                    return {
                        conversations: {
                            ...state.conversations,
                            [requestId]: {
                                ...conversation,
                                messages: [...conversation.messages, newMessage],
                            },
                        },
                    };
                });
            },
            getConversation: (requestId) => get().conversations[requestId],
        }),
        {
            name: 'chat-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
