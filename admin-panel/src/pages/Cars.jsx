import { ChevronLeft, ChevronRight, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import CarModal from '../components/CarModal';
import api from '../lib/axios';

export default function Cars() {
    const [cars, setCars] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCars, setTotalCars] = useState(0);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCar, setEditingCar] = useState(null);

    useEffect(() => {
        fetchCars();
        fetchUsers();
    }, [currentPage, searchTerm]);

    const fetchCars = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: 10,
                search: searchTerm || undefined
            };

            const res = await api.get('/admin/cars', { params });
            if (Array.isArray(res.data)) {
                setCars(res.data);
                setTotalPages(1);
            } else {
                setCars(res.data.cars);
                setTotalPages(res.data.totalPages);
                setTotalCars(res.data.totalCars);
                setCurrentPage(res.data.currentPage);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            // Fetch users for the dropdown when assigning a car to an owner
            // In a real app with many users, you might want an async select instead of loading all users
            const res = await api.get('/admin/users', { params: { limit: 100 } });
            if (Array.isArray(res.data)) {
                setUsers(res.data);
            } else {
                setUsers(res.data.users || []);
            }
        } catch (err) {
            console.error("Failed to load users for car assignment", err);
        }
    };

    const handleCreateCar = async (formData) => {
        try {
            await api.post('/admin/cars', formData);
            fetchCars();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to create car');
        }
    };

    const handleUpdateCar = async (formData) => {
        if (!editingCar) return;
        try {
            await api.put(`/admin/cars/${editingCar._id}`, formData);
            fetchCars();
            setIsModalOpen(false);
            setEditingCar(null);
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to update car');
        }
    };

    const handleDeleteCar = async (id) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await api.delete(`/admin/cars/${id}`);
            fetchCars();
        } catch (err) {
            alert('Failed to delete car');
        }
    };

    const openEditModal = (car) => {
        setEditingCar(car);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingCar(null);
        setIsModalOpen(true);
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Car Management</h1>
                    <p className="text-slate-400 mt-1">Manage platform vehicles</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add Car
                    </button>
                </div>
            </div>

            {/* Controls Container */}
            <div className="flex flex-col gap-4 mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">

                {/* Top Row: Search */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-slate-400 font-medium whitespace-nowrap">Filter & Search</div>
                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search marque, model..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700/50 bg-slate-800/80 text-sm text-slate-400 uppercase tracking-wider">
                                <th className="p-4 font-medium">Car</th>
                                <th className="p-4 font-medium">Owner</th>
                                <th className="p-4 font-medium">Added On</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-500">Loading cars...</td>
                                </tr>
                            ) : cars.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-500">No cars found.</td>
                                </tr>
                            ) : (
                                cars.map(car => (
                                    <tr key={car._id} className="group hover:bg-slate-800/40 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden shrink-0 border border-slate-600 flex items-center justify-center">
                                                    {car.images && car.images.length > 0 && car.images[0] ? (
                                                        <img src={car.images[0]} alt="car" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-slate-500 text-[10px] text-center p-1 leading-tight font-medium">
                                                            No<br />Image
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-200">{car.marque} {car.model}</div>
                                                    <div className="text-xs text-slate-500">{car.year} • {car.color} • {car.places} seats</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {car.ownerId ? (
                                                <div>
                                                    <div className="font-medium text-sm text-slate-300">{car.ownerId.fullName}</div>
                                                    <div className="text-xs text-slate-500">{car.ownerId.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500 italic">Admin / Default</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-400">
                                            {new Date(car.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                                                <button
                                                    onClick={() => openEditModal(car)}
                                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Edit Car"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteCar(car._id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete Car"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4">
                <div className="text-sm text-slate-400">
                    Showing page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1 || loading}
                        className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || loading}
                        className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <CarModal
                    car={editingCar}
                    users={users}
                    onClose={() => setIsModalOpen(false)}
                    onSave={editingCar ? handleUpdateCar : handleCreateCar}
                />
            )}
        </div>
    );
}
