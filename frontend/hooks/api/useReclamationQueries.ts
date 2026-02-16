import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export interface Reclamation {
    id: string;
    reporterId: string;
    tripId?: string;
    type: 'accident' | 'behaving' | 'lost_item' | 'technical' | 'other';
    subject: string;
    description: string;
    evidenceUrls?: string[];
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    createdAt: string;
    messages?: {
        _id: string;
        senderId: {
            _id: string;
            fullName: string;
            photoURL?: string;
        } | string;
        text: string;
        createdAt: string;
    }[];
}

export const reclamationKeys = {
    all: ['reclamations'] as const,
    list: () => [...reclamationKeys.all, 'list'] as const,
    detail: (id: string) => [...reclamationKeys.all, 'detail', id] as const,
};

export const useReclamations = () => {
    return useQuery<Reclamation[]>({
        queryKey: reclamationKeys.list(),
        queryFn: async (): Promise<Reclamation[]> => {
            const res = await api.get('/reclamations');
            return res.data.map((r: any) => ({
                id: r._id,
                reporterId: r.reporterId,
                tripId: r.tripId,
                type: r.type,
                subject: r.subject,
                description: r.description,
                evidenceUrls: r.evidenceUrls || (r.evidenceUrl ? [r.evidenceUrl] : []),
                status: r.status,
                createdAt: r.createdAt,
            }));
        }
    });
};

export const useReclamation = (id: string) => {
    return useQuery<Reclamation>({
        queryKey: reclamationKeys.detail(id),
        queryFn: async (): Promise<Reclamation> => {
            const res = await api.get(`/reclamations/${id}`);
            const data = res.data;
            return {
                ...data,
                id: data._id,
                evidenceUrls: data.evidenceUrls || (data.evidenceUrl ? [data.evidenceUrl] : []),
            };
        },
        enabled: !!id,
    });
};

export const useAddReclamation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            type: string;
            subject: string;
            description: string;
            evidenceUrls?: string[];
            tripId?: string;
        }) => {
            const res = await api.post('/reclamations', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reclamationKeys.list() });
        },
    });
};

export const useAddMessage = (reclamationId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ text, image }: { text: string; image?: string | null }) => {
            const res = await api.post(`/reclamations/${reclamationId}/messages`, { text, image });
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(reclamationKeys.detail(reclamationId), (oldData: any) => {
                if (!oldData) return data;
                return {
                    ...data,
                    id: data._id,
                    evidenceUrls: data.evidenceUrls || (data.evidenceUrl ? [data.evidenceUrl] : []),
                };
            });
            queryClient.invalidateQueries({ queryKey: reclamationKeys.list() });
        },
    });
};
