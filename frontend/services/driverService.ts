import api from './api';

export interface WalletData {
    balance: number;
    earningsToday: number;
    earningsTotal: number;
    transactions: any[];
}

export interface AnalyticsData {
    acceptanceRate: number;
    completionRate: number;
    hoursOnline: number;
    tripsCompleted: number;
    earningsTotal: number;
    memberSince: string;
}

class DriverService {
    async updateStatus(status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'BREAK'): Promise<string> {
        const response = await api.put('/auth/status', { status });
        return response.data.status;
    }

    async getWallet(): Promise<WalletData> {
        const response = await api.get('/wallet/driver');
        return response.data;
    }

    async withdraw(amount: number): Promise<any> {
        const response = await api.post('/wallet/driver/withdraw', { amount });
        return response.data;
    }

    async getStats(): Promise<AnalyticsData> {
        const response = await api.get('/analytics/driver/stats');
        return response.data;
    }
}

export default new DriverService();
