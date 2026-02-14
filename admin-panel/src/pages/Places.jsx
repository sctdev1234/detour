import { ChevronDown, MapPin, PanelLeftClose, PanelLeftOpen, Plus, Search, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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

    // Map & Full Screen State
    const [mapCenter, setMapCenter] = useState([33.5731, -7.5898]);
    const [displayedPlaces, setDisplayedPlaces] = useState([]);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open in full screen

    useEffect(() => {
        fetchPlaces(currentPage);
    }, [currentPage]);

    const fetchPlaces = async (page) => {
        setLoading(true);
        try {
            // For full screen experience, we might want to fetch ALL places if in full screen?
            // But for now let's keep it paginated or maybe increase limit?
            // The user said "show the box in left that contains all the person". 
            // If they mean ALL places, we might need a "load all" for map view.
            // For now, adhere to pagination but maybe larger limit? OR stick to current page for consistency.
            const limit = isFullScreen ? 100 : 6;
            const res = await api.get(`/admin/places?page=${page}&limit=${limit}`);
            setPlaces(res.data.places);
            setTotalPages(res.data.totalPages);
            setCurrentPage(res.data.currentPage);
        } catch (err) {
            console.error("Failed to fetch places", err);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when entering full screen to get more points?
    useEffect(() => {
        fetchPlaces(currentPage);
    }, [isFullScreen]);

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
            if (currentPage === 1) {
                fetchPlaces(1);
            } else {
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

    useEffect(() => {
        setDisplayedPlaces([]);
    }, [places]);

    // Group Places by User
    const usersWithPlaces = useMemo(() => {
        const groups = {};
        places.forEach(place => {
            if (!place.user) return;
            const userId = place.user._id;
            if (!groups[userId]) {
                groups[userId] = {
                    user: place.user,
                    places: []
                };
            }
            groups[userId].places.push(place);
        });
        return Object.values(groups);
    }, [places]);

    const handleUserSelect = (userGroup) => {
        if (selectedUserId === userGroup.user._id) {
            setSelectedUserId(null);
            setDisplayedPlaces([]);
        } else {
            setSelectedUserId(userGroup.user._id);
            setDisplayedPlaces(userGroup.places);

            // Center map on first place
            if (userGroup.places.length > 0) {
                const firstPlace = userGroup.places[0];
                if (firstPlace.latitude && firstPlace.longitude) {
                    setMapCenter([firstPlace.latitude, firstPlace.longitude]);
                }
            }
        }
    };

    // Derived places to show on map
    const mapPlaces = useMemo(() => {
        if (!isFullScreen) return displayedPlaces;
        if (selectedUserId) return displayedPlaces;
        return places; // Show all in full screen if no user selected
    }, [isFullScreen, selectedUserId, displayedPlaces, places]);

    // Filter Users
    const filteredUsers = usersWithPlaces.filter(group => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            group.user.fullName?.toLowerCase().includes(query) ||
            group.user.email?.toLowerCase().includes(query) ||
            group.places.some(p => p.address.toLowerCase().includes(query))
        );
    });

    const handleLocationClick = (place) => {
        if (place.latitude && place.longitude) {
            setMapCenter([place.latitude, place.longitude]);
            setDisplayedPlaces([place]);
            if (!isFullScreen) window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const fullScreenContent = (
        <div className={`transition-all duration-500 ease-in-out ${isFullScreen ? 'fixed inset-0 z-[9999] bg-slate-950' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}`}>

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

            {/* Map Section */}
            <div className={`transition-all duration-500 ${isFullScreen ? 'h-screen absolute inset-0 z-0' : 'lg:col-span-3 h-[400px] relative z-0'}`}>
                <PlacesMap
                    places={isFullScreen ? mapPlaces : displayedPlaces}
                    center={mapCenter}
                    isFullScreen={isFullScreen}
                    onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
                />
            </div>

            {/* Sidebar / Table Section */}
            <div className={`
                transition-all duration-500 ease-in-out
                ${isFullScreen
                    ? `absolute top-4 left-16 bottom-4 w-[400px] z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden 
                       ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[110%] opacity-0 pointer-events-none'}`
                    : 'lg:col-span-3'}
            `}>

                {/* Full Screen Sidebar Header */}
                {isFullScreen && (
                    <div className="p-4 border-b border-slate-700/50 bg-slate-900/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-400" />
                                Users & Places
                            </h2>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                title="Add New Place"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search users or places..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all"
                            />
                        </div>
                    </div>
                )}

                <div className={`${isFullScreen ? 'flex-1 overflow-y-auto p-4 custom-scrollbar' : ''}`}>
                    {loading ? (
                        <div className="text-slate-400 text-center py-10">Loading...</div>
                    ) : isFullScreen ? (
                        // User List for Full Screen Sidebar
                        <div className="space-y-3">
                            {filteredUsers.map((group) => {
                                const isSelected = selectedUserId === group.user._id;
                                return (
                                    <div
                                        key={group.user._id}
                                        className={`
                                            rounded-2xl border transition-all duration-300 overflow-hidden
                                            ${isSelected
                                                ? 'bg-slate-800/80 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600'
                                            }
                                        `}
                                    >
                                        <div
                                            onClick={() => handleUserSelect(group)}
                                            className="p-4 cursor-pointer flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img
                                                        src={group.user.photoURL || `https://ui-avatars.com/api/?name=${group.user.fullName}&background=0D8ABC&color=fff`}
                                                        alt={group.user.fullName}
                                                        className={`w-10 h-10 rounded-full object-cover border-2 ${isSelected ? 'border-blue-400 ring-2 ring-blue-500/20' : 'border-slate-600'}`}
                                                    />
                                                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${group.user.role === 'driver' ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                                                </div>
                                                <div>
                                                    <h4 className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                                        {group.user.fullName}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-bold text-slate-500">{group.user.role}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                        <span className="text-xs text-slate-400">{group.places.length} Place{group.places.length !== 1 && 's'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`transition-transform duration-300 ${isSelected ? 'rotate-180' : ''}`}>
                                                <ChevronDown className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} />
                                            </div>
                                        </div>

                                        {/* Expanded Places List */}
                                        <div className={`
                                            transition-all duration-300 ease-in-out overflow-hidden bg-slate-900/50
                                            ${isSelected ? 'max-h-[500px] border-t border-slate-700/50' : 'max-h-0'}
                                        `}>
                                            <div className="p-3 space-y-2">
                                                {group.places.map(place => (
                                                    <div
                                                        key={place._id}
                                                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group/place"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent toggling user
                                                            handleLocationClick(place);
                                                        }}
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover/place:text-blue-400 group-hover/place:bg-blue-500/10 transition-colors shrink-0">
                                                            <MapPin className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-sm font-medium text-slate-300 group-hover/place:text-white transition-colors">
                                                                {place.label || place.name}
                                                            </h5>
                                                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                                                {place.address}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Places Management
                    </h1>
                    <p className="text-slate-400 mt-1">Manage locations and view them on the map</p>
                </div>
                {!isFullScreen && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Place
                    </button>
                )}
            </div>

            {isFullScreen ? createPortal(fullScreenContent, document.body) : fullScreenContent}

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
