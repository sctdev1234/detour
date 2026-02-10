import { CheckCircle, Eye, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import DriverDetailModal from '../components/DriverDetailModal';
import api from '../lib/axios';

export default function VerificationRequests() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPendingDrivers();
    }, []);

    const fetchPendingDrivers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/pending-drivers');
            setDrivers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const verifyDriver = async (id) => {
        if (!confirm('Verify this driver?')) return;
        try {
            await api.post(`/admin/verify-driver/${id}`);
            setDrivers(prev => prev.filter(d => d._id !== id));
            setSelectedDriver(null);
        } catch (err) {
            alert('Failed');
        }
    };

    const rejectDriver = async (id) => {
        if (!confirm('Reject this driver?')) return;
        try {
            await api.post(`/admin/reject-driver/${id}`);
            setDrivers(prev => prev.filter(d => d._id !== id));
            setSelectedDriver(null);
        } catch (err) {
            alert('Failed');
        }
    };

    // Filtered drivers based on search
    const filteredDrivers = drivers.filter(driver => 
        driver.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        driver.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Verification Requests</h1>
                    <p className="text-slate-400 mt-1">Manage pending driver applications</p>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search requests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 w-full md:w-64"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-slate-400">Loading requests...</div>
            ) : filteredDrivers.length === 0 ? (
                <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-300">No pending requests</h3>
                    <p className="text-slate-500">All driver applications have been processed.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredDrivers.map(driver => (
                        <div
                            key={driver._id}
                            onClick={() => setSelectedDriver(driver)}
                            className="p-4 md:p-6 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 hover:border-blue-500/50 hover:bg-slate-800/80 cursor-pointer transition-all group"
                        >
                            {/* Avatar */}
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-700 overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all">
                                {driver.photoURL ? (
                                    <img src={driver.photoURL} alt={driver.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xl font-bold">
                                        {driver.fullName?.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-slate-100 truncate group-hover:text-blue-400 transition-colors">
                                        {driver.fullName}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        DRIVER
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 truncate">{driver.email}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                    <span>Applied: {new Date(driver.createdAt).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>ID: {driver._id.slice(-6)}</span>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="shrink-0 flex flex-col items-end gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                    Pending Review
                                </span>
                            </div>

                            {/* Quick Action (View) */}
                            <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-slate-700/50 text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                                <Eye className="w-5 h-5" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {selectedDriver && (
                <DriverDetailModal
                    driver={selectedDriver}
                    onClose={() => setSelectedDriver(null)}
                    onApprove={verifyDriver}
                    onReject={rejectDriver}
                    // onBan not needed here for pending logic usually, but consistent with modal
                    onBan={() => {}} 
                />
            )}
        </div>
    );
}
