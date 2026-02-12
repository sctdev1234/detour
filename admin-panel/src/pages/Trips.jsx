import { Map } from 'lucide-react';
import { useEffect, useState } from 'react';
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

    useEffect(() => {
        fetchTrips();
    }, [page]);

    const fetchTrips = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/trips?page=${page}&limit=10`);
            setTrips(res.data.trips);
            setTotalPages(res.data.totalPages);
            // Select first trip by default if available? No, let user choose.

        } catch (err) {
            console.error("Failed to fetch trips", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTripSelect = (trip) => {
        setSelectedTrip(trip);
        // Scroll to map
        // window.scrollTo({ top: 0, behavior: 'smooth' }); // Optional: auto-scroll on select
    };

    const handleFocusPoint = (coords) => {
        setFocusCoords(coords);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="relative">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
                <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
                    Trips Management
                </h1>

                <div className="grid gap-8">
                    {/* Map Section */}
                    <div className="w-full">
                        <TripsMap selectedTrip={selectedTrip} focusCoords={focusCoords} />
                    </div>

                    {/* Table Section */}
                    {loading ? (
                        <div className="text-slate-400">Loading trips...</div>
                    ) : trips.length === 0 ? (
                        <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                            <Map className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-300">No trips recorded</h3>
                        </div>
                    ) : (
                        <TripsTable
                            trips={trips}
                            onSelectTrip={handleTripSelect}
                            selectedTripId={selectedTrip?._id}
                            onFocusPoint={handleFocusPoint}
                        />
                    )}

                    {/* Pagination Controls */}
                    {!loading && trips.length > 0 && (
                        <div className="flex justify-center items-center gap-4 mt-4">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-slate-400">
                                Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
