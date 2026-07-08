import React, { useState, useEffect } from 'react';
import api from "../lib/axios";

export default function Finance() {
    const [activeTab, setActiveTab] = useState('ledger');
    const [transactions, setTransactions] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData(activeTab);
    }, [activeTab]);

    const fetchData = async (tab) => {
        setLoading(true);
        try {
            if (tab === 'ledger') {
                const { data } = await api.get('/admin/finance/transactions');
                setTransactions(data);
            } else {
                const { data } = await api.get('/admin/finance/withdrawals');
                setWithdrawals(data);
            }
        } catch (error) {
            console.error(`Error fetching ${tab}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.post(`/admin/finance/withdrawals/${id}/approve`);
            fetchData('withdrawals');
        } catch (error) {
            alert('Failed to approve withdrawal');
            console.error(error);
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Enter rejection reason:');
        if (reason === null) return;
        try {
            await api.post(`/admin/finance/withdrawals/${id}/reject`, { reason });
            fetchData('withdrawals');
        } catch (error) {
            alert('Failed to reject withdrawal');
            console.error(error);
        }
    };

    const renderLedger = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount (MAD)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map(tx => (
                        <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{new Date(tx.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{tx.userId?.fullName || tx.userId}</td>
                            <td className="px-6 py-4 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {tx.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 capitalize">{tx.category}</td>
                            <td className={`px-6 py-4 text-sm text-right font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.type === 'credit' ? '+' : '-'}{tx.amount.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderWithdrawals = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Driver</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount (MAD)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {withdrawals.map(tx => (
                        <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{new Date(tx.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{tx.userId?.fullName || 'Unknown'}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{tx.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : tx.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {tx.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-right space-x-2">
                                {tx.status === 'pending' && (
                                    <>
                                        <button 
                                            onClick={() => handleApprove(tx._id)}
                                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                        >
                                            Approve
                                        </button>
                                        <button 
                                            onClick={() => handleReject(tx._id)}
                                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finance & Ledger</h1>
            </div>

            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
                <button
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition ${activeTab === 'ledger' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('ledger')}
                >
                    Platform Ledger
                </button>
                <button
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition ${activeTab === 'withdrawals' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('withdrawals')}
                >
                    Payouts & Withdrawals
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : (
                activeTab === 'ledger' ? renderLedger() : renderWithdrawals()
            )}
        </div>
    );
}
