import { CheckCircle, Clock, Map, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/axios';

export default function Trips() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrips();
    }, []);

    const fetchTrips = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/trips');
            setTrips(res.data);
        } catch (err) {
            console.error("Failed to fetch trips", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Trips Management</h1>

            {loading ? (
                <div className="text-slate-400">Loading...</div>
            ) : trips.length === 0 ? (
                <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                    <Map className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">No trips recorded</h3>
                </div>
            ) : (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-medium">Trip ID</th>
                                <th className="p-4 font-medium">Driver</th>
                                <th className="p-4 font-medium">Price</th>
                                <th className="p-4 font-medium">Date</th>
                                <th className="p-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-sm">
                            {trips.map(trip => (
                                <tr key={trip._id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 font-mono text-slate-400 text-xs">
                                        {trip._id.substring(0, 8)}...
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-200">{trip.driverId?.fullName || 'Unknown'}</div>
                                        <div className="text-slate-500 text-xs">{trip.driverId?.email}</div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-100">${trip.price}</td>
                                    <td className="p-4 text-slate-400">
                                        {new Date(trip.createdAt).toLocaleDateString()} {new Date(trip.createdAt).toLocaleTimeString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${trip.status === 'active' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                trip.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                            {trip.status === 'active' && <Clock className="w-3 h-3" />}
                                            {trip.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                                            {trip.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                                            <span className="capitalize">{trip.status}</span>
                                        </span>
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
