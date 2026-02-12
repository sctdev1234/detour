import { MapPin, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import PlacesTable from '../components/PlacesTable';
import api from '../lib/axios';
// Use dynamic import for map to avoid SSR issues if any (though this is SPA)
import PlacesMap from '../components/PlacesMap';

export default function Places() {
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Form state
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [category, setCategory] = useState('other');
    const [selectedLocation, setSelectedLocation] = useState(null); // { lat, lng }

    useEffect(() => {
        fetchPlaces(currentPage);
    }, [currentPage]);

    const fetchPlaces = async (page) => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/places?page=${page}&limit=6`); // Limit 6 for demo/UI fit
            setPlaces(res.data.places);
            setTotalPages(res.data.totalPages);
            setCurrentPage(res.data.currentPage);
        } catch (err) {
            console.error("Failed to fetch places", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlace = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name,
                address,
                category,
                latitude: selectedLocation ? selectedLocation.lat : undefined,
                longitude: selectedLocation ? selectedLocation.lng : undefined
            };

            const res = await api.post('/admin/places', payload);
            // Re-fetch to allow backend to sort/page correctly, or just add to top if on page 1
            if (currentPage === 1) {
                fetchPlaces(1);
            } else {
                // Optionally jump to page 1
                setCurrentPage(1);
            }

            setShowAddModal(false);
            resetForm();
        } catch (err) {
            alert('Failed to add place');
            console.error(err);
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

    const resetForm = () => {
        setName('');
        setAddress('');
        setCategory('other');
        setSelectedLocation(null);
    };

    const [mapCenter, setMapCenter] = useState([33.5731, -7.5898]);
    const [displayedPlaces, setDisplayedPlaces] = useState([]);

    useEffect(() => {
        // Initially show nothing or maybe the first one? User said "just when i click".
        // asking for "markers are listed on the map" -> "show it ... just when click".
        // So start empty.
        setDisplayedPlaces([]);
    }, [places]);

    const handleLocationClick = (place) => {
        if (place.latitude && place.longitude) {
            setMapCenter([place.latitude, place.longitude]);
            setDisplayedPlaces([place]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Places Management
                    </h1>
                    <p className="text-slate-400 mt-1">Manage locations and view them on the map</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Add New Place
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map Section - Takes 1/3 on large screens, or full width if needed */}
                <div className="lg:col-span-3 h-[400px]">
                    <PlacesMap
                        places={displayedPlaces}
                        center={mapCenter}
                    />
                </div>

                {/* Table Section */}
                <div className="lg:col-span-3">
                    {loading ? (
                        <div className="text-slate-400 text-center py-10">Loading places...</div>
                    ) : (
                        <PlacesTable
                            places={places}
                            onDelete={handleDelete}
                            onLocationClick={handleLocationClick}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => setCurrentPage(page)}
                        />
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="w-full max-w-4xl bg-slate-800 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

                        {/* Map Side for Picking Location */}
                        <div className="w-full md:w-1/2 h-[300px] md:h-auto border-b md:border-b-0 md:border-r border-slate-700 relative">
                            <PlacesMap
                                places={[]} // Don't show other places to avoid clutter? Or show them for reference. Let's show empty for clarity in picker.
                                onLocationSelect={setSelectedLocation}
                                selectedLocation={selectedLocation}
                                center={[33.5731, -7.5898]}
                            />
                            <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
                                Click on map to set location
                            </div>
                        </div>

                        {/* Form Side */}
                        <div className="w-full md:w-1/2 p-6 overflow-y-auto">
                            <h2 className="text-xl font-bold mb-1">Add New Place</h2>
                            <p className="text-sm text-slate-400 mb-6">Enter details and select location on the map.</p>

                            <form onSubmit={handleAddPlace} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Place Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Casa Port Station"
                                        className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
                                        className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    >
                                        <option value="station">Station</option>
                                        <option value="airport">Airport</option>
                                        <option value="hospital">Hospital</option>
                                        <option value="school">School</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <MapPin className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm font-medium text-blue-200">Location Selected</span>
                                    </div>
                                    <p className="text-xs text-blue-300/70">
                                        {selectedLocation
                                            ? `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`
                                            : "No location selected. Click on the map."
                                        }
                                    </p>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            resetForm();
                                        }}
                                        className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!selectedLocation}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        Add Place
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
