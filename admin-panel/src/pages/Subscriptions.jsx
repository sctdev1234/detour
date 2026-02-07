import { Check, CreditCard, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/axios';

export default function Subscriptions() {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        type: 'client',
        price: '',
        durationDays: 30,
        features: ''
    });

    useEffect(() => {
        fetchSubs();
    }, []);

    const fetchSubs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/subscriptions');
            setSubs(res.data);
        } catch (err) {
            console.error("Failed to fetch subscriptions", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const featureList = formData.features.split('\n').filter(f => f.trim());
            const data = { ...formData, features: featureList };

            const res = await api.post('/admin/subscriptions', data);
            setSubs([res.data, ...subs]);
            setShowAddModal(false);
            setFormData({ title: '', type: 'client', price: '', durationDays: 30, features: '' });
        } catch (err) {
            alert('Failed to add subscription');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this plan?')) return;
        try {
            await api.delete(`/admin/subscriptions/${id}`);
            setSubs(subs.filter(s => s._id !== id));
        } catch (err) {
            alert('Failed to delete');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Subscriptions (Abonnements)</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Plan
                </button>
            </div>

            {loading ? (
                <div className="text-slate-400">Loading...</div>
            ) : subs.length === 0 ? (
                <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                    <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">No active plans</h3>
                    <p className="text-slate-500">Create subscription packages for your users.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subs.map(sub => (
                        <div key={sub._id} className="relative p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex flex-col hover:border-slate-600 transition-all group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDelete(sub._id)}
                                    className="p-2 text-slate-500 hover:text-red-400 bg-slate-800 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="mb-4">
                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide ${sub.type === 'driver' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                    }`}>
                                    {sub.type}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{sub.title}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-3xl font-bold text-white">${sub.price}</span>
                                <span className="text-slate-500">/{sub.durationDays} days</span>
                            </div>

                            <div className="space-y-3 mb-8 flex-1">
                                {sub.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors">
                                Edit Details
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Create New Plan</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Plan Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                    >
                                        <option value="client">Client</option>
                                        <option value="driver">Driver</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Price ($)</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Duration (Days)</label>
                                <input
                                    type="number"
                                    value={formData.durationDays}
                                    onChange={e => setFormData({ ...formData, durationDays: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Features (one per line)</label>
                                <textarea
                                    value={formData.features}
                                    onChange={e => setFormData({ ...formData, features: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white h-24 resize-none"
                                    placeholder="Free Cancellations&#10;Priority Support"
                                ></textarea>
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
                                    Create Plan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
