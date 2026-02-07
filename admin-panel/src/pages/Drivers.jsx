import { Eye, Filter, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import DriverDetailModal from '../components/DriverDetailModal';
import api from '../lib/axios';

export default function Drivers() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'all'
    const [selectedDriver, setSelectedDriver] = useState(null);

    useEffect(() => {
        fetchDrivers();
    }, [activeTab]);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'pending'
                ? '/admin/pending-drivers'
                : '/admin/users?role=driver';

            const res = await api.get(endpoint);
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
            setDrivers(drivers.filter(d => d._id !== id));
            setSelectedDriver(null);
        } catch (err) {
            alert('Failed');
        }
    };

    const rejectDriver = async (id) => {
        if (!confirm('Reject this driver?')) return;
        try {
            await api.post(`/admin/reject-driver/${id}`);
            setDrivers(drivers.filter(d => d._id !== id));
            setSelectedDriver(null);
        } catch (err) {
            alert('Failed');
        }
    };

    const banDriver = async (id) => {
        if (!confirm('Are you sure you want to BAN this driver?')) return;
        try {
            await api.post(`/admin/ban-user/${id}`);
            // If in 'all' tab, Update status locally instead of removing
            if (activeTab === 'all') {
                setDrivers(drivers.map(d => d._id === id ? { ...d, verificationStatus: 'rejected' } : d));
            } else {
                setDrivers(drivers.filter(d => d._id !== id));
            }
            setSelectedDriver(null);
        } catch (err) {
            alert('Failed to ban user');
        }
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Driver Management</h1>
                <div className="flex gap-2">
                    <button className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">
                        <Filter className="w-5 h-5 text-slate-400" />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search drivers..."
                            className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'pending' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'
                        }`}
                >
                    Verification Queue
                    {activeTab === 'pending' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full"></div>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'all' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'
                        }`}
                >
                    All Drivers
                    {activeTab === 'all' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full"></div>
                    )}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-slate-400">Loading...</div>
            ) : drivers.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                    <p className="text-slate-500">No drivers found in this list.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {drivers.map(driver => (
                        <div
                            key={driver._id}
                            onClick={() => setSelectedDriver(driver)}
                            className="p-6 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-6 hover:border-blue-500/50 hover:bg-slate-800/80 cursor-pointer transition-all group"
                        >
                            {/* Avatar */}
                            <div className="w-16 h-16 rounded-full bg-slate-700 overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all">
                                {driver.photoURL ? (
                                    <img src={driver.photoURL} alt={driver.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xl font-bold">
                                        {driver.fullName.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{driver.fullName}</h3>
                                <p className="text-sm text-slate-400">{driver.email}</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                        Pending Review
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">
                                        ID: {driver._id.slice(-6)}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Action (View) */}
                            <div className="hidden md:flex text-slate-500 group-hover:text-blue-400 transition-colors">
                                <Eye className="w-6 h-6" />
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
                    onBan={banDriver}
                />
            )}
        </div>
    );
}
