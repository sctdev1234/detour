import { CheckCircle, Clock, DollarSign, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/axios';

export default function Credits() {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/withdrawals');
            setWithdrawals(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => { // action: 'approve' or 'reject'
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;
        try {
            await api.post(`/admin/withdrawals/${id}/${action}`);
            fetchWithdrawals(); // Refresh list to update status
        } catch (err) {
            alert('Action failed');
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Withdrawal Requests</h1>

            {loading ? (
                <div className="text-slate-400">Loading...</div>
            ) : withdrawals.length === 0 ? (
                <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                    <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">No active requests</h3>
                    <p className="text-slate-500">Pending withdrawals will appear here.</p>
                </div>
            ) : (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Amount</th>
                                <th className="p-4 font-medium">Method</th>
                                <th className="p-4 font-medium">Date</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-sm">
                            {withdrawals.map(w => (
                                <tr key={w._id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-slate-200">{w.user?.fullName || 'Unknown User'}</div>
                                        <div className="text-slate-500 text-xs">{w.user?.email}</div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-100">${w.amount.toFixed(2)}</td>
                                    <td className="p-4">
                                        <div className="text-slate-300">{w.paymentMethod}</div>
                                        <div className="text-slate-500 text-xs font-mono">{w.paymentDetails}</div>
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {new Date(w.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${w.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                            {w.status === 'pending' && <Clock className="w-3 h-3" />}
                                            {w.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                                            {w.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                            <span className="capitalize">{w.status}</span>
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {w.status === 'pending' && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleAction(w._id, 'reject')}
                                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(w._id, 'approve')}
                                                    className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
