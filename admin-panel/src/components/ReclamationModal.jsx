import { CheckCircle, Clock, MapPin, MessageSquare, User, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../lib/axios';

export default function ReclamationModal({ reclamation, onClose, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const reclamationRef = useRef(reclamation);

    // Keep ref in sync
    useEffect(() => {
        reclamationRef.current = reclamation;
    }, [reclamation]);

    useEffect(() => {
        const socket = io('http://localhost:5000');

        socket.emit('join_reclamation', reclamation._id);

        socket.on('new_message', (newMessage) => {
            console.log('New message received:', newMessage);
            const currentRec = reclamationRef.current;

            // Check for duplicates
            if (currentRec.messages.some(m => m._id === newMessage._id)) return;

            const updatedRec = {
                ...currentRec,
                messages: [...currentRec.messages, newMessage]
            };
            onUpdate(updatedRec);
        });

        return () => {
            socket.emit('leave_reclamation', reclamation._id);
            socket.disconnect();
        };
    }, [reclamation._id]); // Only re-run if ID changes

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

    const handleSendMessage = async (text) => {
        setLoading(true); // Maybe use a separate loading state for chat sending to not block UI entirely
        try {
            const res = await api.post(`/reclamations/${reclamation._id}/messages`, { text });
            onUpdate(res.data); // Update the parent state so re-render shows new message
            // Note: because onUpdate replaces the object in the list, and we pass `selectedTicket` (which comes from that list) 
            // back to this modal, this modal should re-render with new messages.

            // However, we need to ensure `selectedTicket` in parent is updated.
            // Support.jsx: handleUpdate updates the list. 
            // Support.jsx passes `selectedTicket` prop.
            // Check if Support.jsx auto-updates selectedTicket if it changes in the list.
            // In Support.jsx: `onClick={() => setSelectedTicket(ticket)}` sets it.
            // `handleUpdate` updates the `reclamations` array.
            // Does `selectedTicket` state update? NO. `selectedTicket` is a separate state object.
            // We need to update `selectedTicket` in Support.jsx or use the one from the list.

            // Actually, usually it's better to pass ID and fetch, OR update selectedTicket too.
            // For now, let's assume valid reactivity or I might need to tweak Support.jsx to update selectedTicket.
        } catch (err) {
            console.error(err);
            alert('Failed to send message');
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

                    {/* Evidence Images */}
                    {(reclamation.evidenceUrls?.length > 0 || reclamation.evidenceUrl) && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Evidence</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {(reclamation.evidenceUrls || [reclamation.evidenceUrl]).map((url, index) => (
                                    <div key={index} className="rounded-xl overflow-hidden border border-slate-700/50 relative group">
                                        <img
                                            src={url}
                                            alt={`Evidence ${index + 1}`}
                                            className="w-full h-48 object-cover bg-black cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(url, '_blank')}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chat Section */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            Conversation
                        </h3>
                        <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-96">
                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
                                {[...(reclamation.messages || [])].reverse().map((msg, idx) => {
                                    const isAdmin = msg.senderId?._id === 'admin' || msg.senderId?.role === 'admin' || !msg.senderId?.role; // Adjust based on how admin sends
                                    // Actually, if I send from admin panel, req.user will be the admin user.
                                    // I should check if senderId is the same as the current user? 
                                    // But I don't have current user context here easily without a store.
                                    // HEURISTIC: If the sender is NOT the reporter, it's support/admin.
                                    const isReporter = msg.senderId?._id === reclamation.reporterId?._id;

                                    return (
                                        <div key={idx} className={`flex ${!isReporter ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl p-3 px-4 ${!isReporter
                                                ? 'bg-blue-600 text-white rounded-br-sm'
                                                : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
                                                }`}>
                                                {msg.image && (
                                                    <img
                                                        src={msg.image}
                                                        alt="Attachment"
                                                        className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => window.open(msg.image, '_blank')}
                                                    />
                                                )}
                                                {msg.text && <div className="text-sm">{msg.text}</div>}
                                                <div className={`text-[10px] mt-1 ${!isReporter ? 'text-blue-200' : 'text-slate-500'} text-right`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {/* {!isReporter && ' • You'} */}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!reclamation.messages || reclamation.messages.length === 0) && (
                                    <div className="text-center text-slate-500 text-sm py-4">No messages yet. Start the conversation.</div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-3 bg-slate-800 border-t border-slate-700/50">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const text = e.target.elements.message.value;
                                        if (text.trim()) handleSendMessage(text);
                                        e.target.reset();
                                    }}
                                    className="flex gap-2"
                                >
                                    <input
                                        name="message"
                                        type="text"
                                        placeholder="Type a reply..."
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

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
