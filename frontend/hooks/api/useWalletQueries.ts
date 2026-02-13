import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export const walletKeys = {
    all: ['wallet'] as const,
    transactions: () => [...walletKeys.all, 'transactions'] as const,
};

export const useTransactions = () => {
    return useQuery({
        queryKey: walletKeys.transactions(),
        queryFn: async () => {
            const res = await api.get('/transactions');
            return res.data;
        }
    });
};

export const useSubscribe = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await api.post('/transactions/subscribe');
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: walletKeys.all });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        }
    });
};

export const useCashout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (amount: number) => {
            const res = await api.post('/transactions/cashout', { amount });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: walletKeys.all });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        }
    });
};
