import { ListFilter, Map, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import TripsMap from '../components/TripsMap';
import TripsTable from '../components/TripsTable';
import api from '../lib/axios';

export default function Trips() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [focusCoords, setFocusCoords] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open in full screen

    useEffect(() => {
        fetchTrips();
    }, [page, filterStatus]); // Refetch when filter changes

    const fetchTrips = async () => {
        setLoading(true);
        try {
            // If active, show "all" (limit 100), otherwise use pagination
            const limit = filterStatus === 'active' ? 100 : 10;
            const res = await api.get(`/admin/trips?page=${page}&limit=${limit}&status=${filterStatus}`);
            setTrips(res.data.trips);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error("Failed to fetch trips", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTripSelect = (trip) => {
        setSelectedTrip(trip);
    };

    const handleFocusPoint = (coords) => {
        setFocusCoords(coords);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const fullScreenContent = (
        <div className={`transition-all duration-500 ease-in-out ${isFullScreen ? 'fixed inset-0 z-[9999] bg-slate-950' : 'grid gap-8'}`}>

            {/* Sidebar Toggle Button (Full Screen Only) */}
            {isFullScreen && (
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute top-[85px] left-3 z-[100] p-2 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-xl"
                    title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                >
                    {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                </button>
            )}

            {/* Map Section - Full Screen or Default */}
            <div className={`w-full transition-all duration-500 ${isFullScreen ? 'h-screen absolute inset-0 z-0' : 'relative z-10'}`}>
                <TripsMap
                    selectedTrip={selectedTrip}
                    focusCoords={focusCoords}
                    isFullScreen={isFullScreen}
                    onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
                />
            </div>

            {/* Table Section - Sidebar in Fullscreen */}
            <div className={`
                transition-all duration-500 ease-in-out
                ${isFullScreen
                    ? `absolute top-4 left-16 bottom-4 w-[400px] z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden 
                       ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[110%] opacity-0 pointer-events-none'}`
                    : ''}
            `}>
                {/* Header for Sidebar */}
                {isFullScreen && (
                    <div className="p-4 border-b border-slate-700/50 bg-slate-900/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                <Map className="w-5 h-5 text-blue-400" />
                                Active Trips
                            </h2>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 rounded-lg transition-all ${showFilters ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                title="Toggle Filters"
                            >
                                <ListFilter className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Status Filters - Collapsible */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {['all', 'active', 'pending', 'completed', 'cancelled'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setFilterStatus(status);
                                            setPage(1); // Reset page on filter change
                                        }}
                                        className={`
                                            px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0
                                            ${filterStatus === status
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                            }
                                        `}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search trips (ID, Address)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all"
                            />
                        </div>
                    </div>
                )}

                <div className={`
                    ${isFullScreen ? 'flex-1 overflow-y-auto p-4 custom-scrollbar' : ''}
                `}>
                    {loading ? (
                        <div className="text-slate-400">Loading trips...</div>
                    ) : trips.length === 0 ? (
                        <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                            <Map className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-300">No trips recorded</h3>
                        </div>
                    ) : (
                        <TripsTable
                            trips={trips.filter(t => {
                                // Search Filter (Client-side search on fetched results)
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                return (
                                    t._id.toLowerCase().includes(query) ||
                                    t.routeId?.startPoint?.address?.toLowerCase().includes(query) ||
                                    t.routeId?.endPoint?.address?.toLowerCase().includes(query) ||
                                    t.driverId?.fullName?.toLowerCase().includes(query)
                                );
                            })}
                            onSelectTrip={handleTripSelect}
                            selectedTripId={selectedTrip?._id}
                            onFocusPoint={handleFocusPoint}
                            compact={isFullScreen}
                        />
                    )}

                    {/* Pagination Controls - Hidden for Active Status */}
                    {!loading && trips.length > 0 && filterStatus !== 'active' && (
                        <div className={`flex justify-center items-center gap-4 mt-6 ${isFullScreen ? 'pb-2' : ''}`}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors text-sm"
                            >
                                Prev
                            </button>
                            <span className="text-slate-400 text-sm">
                                <span className="text-white font-bold">{page}</span> / <span className="text-white font-bold">{totalPages}</span>
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors text-sm"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
                <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
                    Trips Management
                </h1>

                {isFullScreen ? createPortal(fullScreenContent, document.body) : fullScreenContent}
            </div>
        </div>
    );
}
