import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Transaction {
    id: string;
    userId: string;
    type: 'subscription' | 'trip_payment' | 'cashout' | 'fee';
    amount: number;
    relatedId?: string; // tripId or other reference
    description: string;
    createdAt: number;
}

export interface Wallet {
    userId: string;
    balance: number;
    subscriptionStatus: 'free' | 'pro';
    subscriptionExpiry?: number;
}

interface FinanceState {
    wallets: Record<string, Wallet>; // userId -> Wallet
    transactions: Transaction[];

    // Actions
    getWallet: (userId: string) => Wallet;
    addTransaction: (userId: string, type: Transaction['type'], amount: number, description: string, relatedId?: string) => void;
    subscribe: (userId: string) => void;
    processTripPayment: (driverId: string, clientId: string, amount: number, tripId: string) => void;
}

export const useFinanceStore = create<FinanceState>()(
    persist(
        (set, get) => ({
            wallets: {},
            transactions: [],

            getWallet: (userId) => {
                const wallet = get().wallets[userId];
                if (wallet) return wallet;

                // Initialize if not exists
                const newWallet: Wallet = {
                    userId,
                    balance: 0,
                    subscriptionStatus: 'free',
                };
                set(state => ({
                    wallets: { ...state.wallets, [userId]: newWallet }
                }));
                return newWallet;
            },

            addTransaction: (userId, type, amount, description, relatedId) => {
                set(state => {
                    const wallet = state.wallets[userId] || { userId, balance: 0, subscriptionStatus: 'free' };
                    const newBalance = wallet.balance + amount;

                    const newTransaction: Transaction = {
                        id: Math.random().toString(36).substring(7),
                        userId,
                        type,
                        amount,
                        description,
                        relatedId,
                        createdAt: Date.now(),
                    };

                    return {
                        wallets: {
                            ...state.wallets,
                            [userId]: { ...wallet, balance: newBalance }
                        },
                        transactions: [newTransaction, ...state.transactions]
                    };
                });
            },

            subscribe: (userId) => {
                const COST = 29.99;
                const wallet = get().getWallet(userId);

                // Allow negative balance for simulation purposes, or check funds
                // if (wallet.balance < COST) return false;

                get().addTransaction(userId, 'subscription', -COST, 'Monthly Pro Subscription');

                set(state => ({
                    wallets: {
                        ...state.wallets,
                        [userId]: {
                            ...state.wallets[userId],
                            subscriptionStatus: 'pro',
                            subscriptionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
                        }
                    }
                }));
            },

            processTripPayment: (driverId, clientId, amount, tripId) => {
                // Deduct from client
                get().addTransaction(clientId, 'trip_payment', -amount, `Payment for trip`, tripId);

                // Add to driver (minus fee?)
                const FEE_PERCENT = 0.10;
                const fee = amount * FEE_PERCENT;
                const driverEarnings = amount - fee;

                get().addTransaction(driverId, 'trip_payment', driverEarnings, `Earnings from trip`, tripId);
                get().addTransaction(driverId, 'fee', -fee, `Platform fee (10%)`, tripId);
            }
        }),
        {
            name: 'finance-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
