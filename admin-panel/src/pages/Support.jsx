import { CheckCircle, Clock, Filter, MessageSquare, Search, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReclamationModal from '../components/ReclamationModal';
import api from '../lib/axios';

export default function Support() {
    const [reclamations, setReclamations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReclamations();
    }, []);

    const fetchReclamations = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reclamations/admin/all');
            setReclamations(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (updatedTicket) => {
        setReclamations(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
    };

    const filteredReclamations = reclamations.filter(ticket => {
        const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
        const matchesSearch =
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.reporterId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.ticketId?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesStatus && matchesSearch;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"><Clock className="w-3 h-3" /> Pending</span>;
            case 'investigating':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"><Search className="w-3 h-3" /> Investigating</span>;
            case 'resolved':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle className="w-3 h-3" /> Resolved</span>;
            case 'dismissed':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20"><XCircle className="w-3 h-3" /> Dismissed</span>;
            default:
                return null;
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Support & Reclamations</h1>
                    <p className="text-slate-400 mt-1">Manage user reports and support tickets</p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                <Filter className="w-4 h-4 text-slate-500" />
                {['all', 'pending', 'investigating', 'resolved', 'dismissed'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filterStatus === status
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading tickets...</div>
            ) : filteredReclamations.length === 0 ? (
                <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                    <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">No tickets found</h3>
                    <p className="text-slate-500">
                        {filterStatus !== 'all' ? `No tickets marked as ${filterStatus}.` : 'Great job! Inbox is empty.'}
                    </p>
                </div>
            ) : (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Subject</th>
                                <th className="p-4 font-medium">Type</th>
                                <th className="p-4 font-medium">Date</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-sm">
                            {filteredReclamations.map(ticket => (
                                <tr
                                    key={ticket._id}
                                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedTicket(ticket)}
                                >
                                    <td className="p-4">
                                        <div className="font-medium text-slate-200">{ticket.reporterId?.fullName || 'Unknown'}</div>
                                        <div className="text-xs text-slate-500">{ticket.reporterId?.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-300">{ticket.subject}</div>
                                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{ticket.description}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs font-mono lowercase">
                                            {ticket.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(ticket.status)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {selectedTicket && (
                <ReclamationModal
                    reclamation={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    );
}
