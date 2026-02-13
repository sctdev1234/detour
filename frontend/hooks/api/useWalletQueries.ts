import { useQuery } from '@tanstack/react-query';
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
