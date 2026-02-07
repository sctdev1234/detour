import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/axios';

export default function Places() {
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    // Form state
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        fetchPlaces();
    }, []);

    const fetchPlaces = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/places');
            setPlaces(res.data);
        } catch (err) {
            console.error("Failed to fetch places", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlace = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/admin/places', { name, address });
            setPlaces([res.data, ...places]);
            setShowAddModal(false);
            setName('');
            setAddress('');
        } catch (err) {
            alert('Failed to add place');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this place?')) return;
        try {
            await api.delete(`/admin/places/${id}`);
            setPlaces(places.filter(p => p._id !== id));
        } catch (err) {
            alert('Failed to delete place');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Places Management</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add New Place
                </button>
            </div>

            {loading ? (
                <div className="text-slate-400">Loading...</div>
            ) : places.length === 0 ? (
                <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                    <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">No places found</h3>
                    <p className="text-slate-500">Add common destinations like Airports, Stations, etc.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {places.map(place => (
                        <div key={place._id} className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-blue-500/30 transition-all group relative">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200">{place.name}</h3>
                                        <p className="text-sm text-slate-400">{place.address}</p>
                                        <span className="text-xs text-slate-500 mt-1 block">
                                            {new Date(place.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(place._id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Simple Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Add New Place</h2>
                        <form onSubmit={handleAddPlace} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Place Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Central Station"
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    placeholder="Full address..."
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    Add Place
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
