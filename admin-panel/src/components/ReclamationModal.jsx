import { CheckCircle, Clock, MapPin, MessageSquare, User, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/axios';

export default function ReclamationModal({ reclamation, onClose, onUpdate }) {
    const [loading, setLoading] = useState(false);

    if (!reclamation) return null;

    const handleStatusUpdate = async (newStatus) => {
        if (!confirm(`Mark this ticket as ${newStatus}?`)) return;

        setLoading(true);
        try {
            const res = await api.put(`/reclamations/${reclamation._id}/status`, { status: newStatus });
            onUpdate(res.data);
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'investigating': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'resolved': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'dismissed': return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
            default: return 'text-slate-500';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50 sticky top-0 bg-slate-800 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            {reclamation.subject}
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wide ${getStatusColor(reclamation.status)}`}>
                                {reclamation.status}
                            </span>
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Ticket ID: {reclamation._id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* User Info */}
                    <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                            {reclamation.reporterId?.photoURL ? (
                                <img src={reclamation.reporterId.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-6 h-6 text-slate-400" />
                            )}
                        </div>
                        <div>
                            <div className="font-bold text-slate-200">{reclamation.reporterId?.fullName || 'Unknown User'}</div>
                            <div className="text-sm text-slate-500">{reclamation.reporterId?.email}</div>
                            <div className="text-sm text-slate-500">{reclamation.reporterId?.phone}</div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Description
                        </h3>
                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {reclamation.description}
                        </div>
                    </div>

                    {/* Trip Info (if available) */}
                    {reclamation.tripId && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Trip Details
                            </h3>
                            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 space-y-2">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">A</div>
                                    <div className="text-slate-300">{reclamation.tripId.startPoint?.name || 'Pickup Location'}</div>
                                </div>
                                <div className="border-l-2 border-slate-700 ml-4 h-4" />
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">B</div>
                                    <div className="text-slate-300">{reclamation.tripId.endPoint?.name || 'Destination'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Evidence Image */}
                    {reclamation.evidenceUrl && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Evidence</h3>
                            <div className="rounded-xl overflow-hidden border border-slate-700/50">
                                <img src={reclamation.evidenceUrl} alt="Evidence" className="w-full h-auto max-h-96 object-contain bg-black" />
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer / Actions */}
                <div className="p-6 border-t border-slate-700/50 bg-slate-800/50 sticky bottom-0">
                    <div className="flex justify-end gap-3">
                        {reclamation.status === 'pending' && (
                            <button
                                onClick={() => handleStatusUpdate('investigating')}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Clock className="w-4 h-4" /> Mark Investigating
                            </button>
                        )}

                        {reclamation.status !== 'resolved' && (
                            <button
                                onClick={() => handleStatusUpdate('resolved')}
                                disabled={loading}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" /> Resolve Ticket
                            </button>
                        )}

                        {reclamation.status !== 'dismissed' && (
                            <button
                                onClick={() => handleStatusUpdate('dismissed')}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <XCircle className="w-4 h-4" /> Dismiss
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
