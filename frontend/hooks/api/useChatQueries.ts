import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export interface ChatMessage {
    id: string;
    senderId: string | { _id: string; fullName?: string; photoURL?: string };
    text: string;
    createdAt: string;
}

export interface Chat {
    id: string;
    requestId: string;
    participants: string[];
    messages: ChatMessage[];
}

const chatKeys = {
    all: ['chats'] as const,
    detail: (requestId: string) => [...chatKeys.all, requestId] as const,
};

export const useChat = (requestId: string) => {
    return useQuery<Chat>({
        queryKey: chatKeys.detail(requestId),
        queryFn: async (): Promise<Chat> => {
            const res = await api.get(`/chat/${requestId}`);
            const c = res.data;
            return {
                id: c._id,
                requestId: c.requestId,
                participants: c.participants,
                messages: (c.messages || []).map((m: any) => ({
                    id: m._id,
                    senderId: m.senderId,
                    text: m.text,
                    createdAt: m.createdAt,
                })),
            };
        },
        enabled: !!requestId,
        refetchInterval: 5000, // Poll every 5 seconds for new messages
    });
};

export const useSendMessage = (requestId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (text: string) => {
            const res = await api.post(`/chat/${requestId}/message`, { text });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.detail(requestId) });
        },
    });
};
