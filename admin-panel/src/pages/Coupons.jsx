import { Calendar, Copy, Plus, Tag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/axios';

export default function Coupons() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        discountAmount: '',
        discountType: 'fixed',
        expirationDate: '',
        usageLimit: 100
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/coupons');
            setCoupons(res.data);
        } catch (err) {
            console.error("Failed to fetch coupons", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/admin/coupons', formData);
            setCoupons([res.data, ...coupons]);
            setShowAddModal(false);
            setFormData({ code: '', discountAmount: '', discountType: 'fixed', expirationDate: '', usageLimit: 100 });
        } catch (err) {
            alert('Failed to add coupon');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this coupon?')) return;
        try {
            await api.delete(`/admin/coupons/${id}`);
            setCoupons(coupons.filter(c => c._id !== id));
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        // Could show toast
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Coupons</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Coupon
                </button>
            </div>

            {loading ? (
                <div className="text-slate-400">Loading...</div>
            ) : coupons.length === 0 ? (
                <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                    <Tag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">No active coupons</h3>
                    <p className="text-slate-500">Create discount codes for your users.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coupons.map(coupon => (
                        <div key={coupon._id} className="relative p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex flex-col hover:border-slate-600 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-mono text-xl font-bold text-white tracking-wider flex items-center gap-2">
                                            {coupon.code}
                                            <button onClick={() => copyCode(coupon.code)} className="text-slate-500 hover:text-white transition-colors">
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </h3>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide ${new Date(coupon.expirationDate) < new Date() ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                                            }`}>
                                            {new Date(coupon.expirationDate) < new Date() ? 'Expired' : 'Active'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(coupon._id)}
                                    className="p-2 text-slate-500 hover:text-red-400 bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="mb-6">
                                <div className="text-3xl font-bold text-white">
                                    {coupon.discountType === 'percentage' ? `${coupon.discountAmount}%` : `$${coupon.discountAmount}`}
                                    <span className="text-sm font-normal text-slate-500 ml-1">OFF</span>
                                </div>
                            </div>

                            <div className="mt-auto space-y-2 text-sm text-slate-400 border-t border-slate-700/50 pt-4">
                                <div className="flex justify-between">
                                    <span className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Expires</span>
                                    <span>{new Date(coupon.expirationDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Usage</span>
                                    <span>{coupon.usedCount} / {coupon.usageLimit}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Create Coupon</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono uppercase"
                                    placeholder="SUMMER2024"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Discount Type</label>
                                    <select
                                        value={formData.discountType}
                                        onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                    >
                                        <option value="fixed">Fixed Amount ($)</option>
                                        <option value="percentage">Percentage (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Value</label>
                                    <input
                                        type="number"
                                        value={formData.discountAmount}
                                        onChange={e => setFormData({ ...formData, discountAmount: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Expiration Date</label>
                                <input
                                    type="date"
                                    value={formData.expirationDate}
                                    onChange={e => setFormData({ ...formData, expirationDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Usage Limit</label>
                                <input
                                    type="number"
                                    value={formData.usageLimit}
                                    onChange={e => setFormData({ ...formData, usageLimit: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                                >
                                    Create Coupon
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
