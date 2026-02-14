import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export interface Reclamation {
    id: string;
    reporterId: string;
    tripId?: string;
    type: 'accident' | 'behaving' | 'lost_item' | 'other';
    subject: string;
    description: string;
    evidenceUrl?: string;
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    createdAt: string;
}

const reclamationKeys = {
    all: ['reclamations'] as const,
    list: () => [...reclamationKeys.all, 'list'] as const,
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
                evidenceUrl: r.evidenceUrl,
                status: r.status,
                createdAt: r.createdAt,
            }));
        }
    });
};

export const useAddReclamation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            type: string;
            subject: string;
            description: string;
            evidenceUrl?: string;
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
