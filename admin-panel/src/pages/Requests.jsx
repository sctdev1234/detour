import { FileText, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import DocumentModal from '../components/DocumentModal';
import api from '../lib/axios';

export default function Requests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Fetching all drivers to show history of applications
            // In a real scenario, you might have a dedicated 'requests' collection archive
            // For now, listing all drivers gives the "history" of who applied.
            const res = await api.get('/admin/users', {
                params: {
                    role: 'driver',
                    limit: 100 // Fetch meaningful amount of history
                }
            });

            if (res.data.users) {
                setRequests(res.data.users);
            } else if (Array.isArray(res.data)) {
                setRequests(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            req.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || req.verificationStatus === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'verified':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">ACCEPTED</span>;
            case 'rejected':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">REJECTED</span>;
            case 'pending':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">PENDING</span>;
            case 'unverified':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">INCOMPLETE</span>;
            default:
                return null;
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Requests History</h1>
                    <p className="text-slate-400 mt-1">View history of driver applications and outcomes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search history..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                    {['all', 'verified', 'rejected', 'pending'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${filterStatus === status
                                    ? 'bg-slate-700 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {status === 'verified' ? 'Accepted' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading history...</div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-800 border-dashed">
                        <p className="text-slate-500">No records found matching your filters.</p>
                    </div>
                ) : (
                    filteredRequests.map(req => (
                        <div
                            key={req._id}
                            className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800/60 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                                    {req.photoURL ? (
                                        <img src={req.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-200">{req.fullName}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>{req.email || 'No email'}</span>
                                        <span>•</span>
                                        <span>Applied: {new Date(req.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right hidden md:block">
                                    <div className="text-xs text-slate-500 mb-1">Status</div>
                                    {getStatusBadge(req.verificationStatus)}
                                </div>

                                <button
                                    onClick={() => setSelectedUser(req)}
                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                                    title="View Documents"
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedUser && (
                <DocumentModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
}
