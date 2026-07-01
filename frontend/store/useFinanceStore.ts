import { create } from 'zustand';
import driverService, { WalletData } from '../services/driverService';

interface FinanceState {
    wallet: WalletData | null;
    isLoading: boolean;
    error: string | null;
    fetchWallet: () => Promise<void>;
    withdraw: (amount: number) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
    wallet: null,
    isLoading: false,
    error: null,
    fetchWallet: async () => {
        set({ isLoading: true, error: null });
        try {
            const wallet = await driverService.getWallet();
            set({ wallet });
        } catch (error: any) {
            set({ error: error.response?.data?.msg || error.message });
        } finally {
            set({ isLoading: false });
        }
    },
    withdraw: async (amount: number) => {
        set({ isLoading: true, error: null });
        try {
            await driverService.withdraw(amount);
            // Refresh wallet after withdrawal
            const wallet = await driverService.getWallet();
            set({ wallet });
        } catch (error: any) {
            set({ error: error.response?.data?.msg || error.message });
        } finally {
            set({ isLoading: false });
        }
    }
}));
