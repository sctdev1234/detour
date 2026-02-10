import { CheckCircle, ChevronLeft, ChevronRight, Edit2, FileText, Plus, Search, Shield, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import DocumentModal from '../components/DocumentModal';
import UserModal from '../components/UserModal';
import api from '../lib/axios';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'client', 'driver', 'admin'
    const [verificationFilter, setVerificationFilter] = useState('all'); // 'all', 'verified', 'unverified', 'rejected'
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [viewingDocsUser, setViewingDocsUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [activeTab, verificationFilter, currentPage]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: 10,
                role: activeTab !== 'all' ? activeTab : undefined,
                verificationStatus: verificationFilter !== 'all' ? verificationFilter : undefined
            };

            const res = await api.get('/admin/users', { params });
            if (Array.isArray(res.data)) {
                 setUsers(res.data);
                 setTotalPages(1); 
            } else {
                setUsers(res.data.users);
                setTotalPages(res.data.totalPages);
                setTotalUsers(res.data.totalUsers);
                setCurrentPage(res.data.currentPage);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (formData) => {
        try {
            await api.post('/admin/users', formData);
            fetchUsers();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to create user');
        }
    };

    const handleUpdateUser = async (formData) => {
        if (!editingUser) return;
        try {
            await api.put(`/admin/users/${editingUser._id}`, formData);
            fetchUsers();
            setIsModalOpen(false);
            setEditingUser(null);
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to update user');
        }
    };

    const handleBanUser = async (id, isBanned) => {
        try {
            if (isBanned) {
                if (!confirm('Are you sure you want to unban this user?')) return;
                await api.post(`/admin/unban-user/${id}`);
            } else {
                if (!confirm('Are you sure you want to BAN this user?')) return;
                await api.post(`/admin/ban-user/${id}`);
            }
            fetchUsers();
        } catch (err) {
            alert('Action failed');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            fetchUsers(); 
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    // Client-side search
    const filteredUsers = users.filter(user => 
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return <span className="px-2 py-0.5 rounded textxs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">ADMIN</span>;
            case 'driver':
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">DRIVER</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">CLIENT</span>;
        }
    };

    const isBanned = (user) => user.verificationStatus === 'rejected';

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">User Management</h1>
                    <p className="text-slate-400 mt-1">Manage access and permissions for all users</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add User
                    </button>
                </div>
            </div>

            {/* Controls Container */}
            <div className="flex flex-col gap-4 mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                
                {/* Top Row: Role Tabs & Search */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Role Tabs */}
                    <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                        {['all', 'client', 'driver', 'admin'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                    activeTab === tab 
                                        ? 'bg-slate-700 text-white shadow-lg' 
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}s
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search in page..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Bottom Row: Multi-Switch Toggle for Verification Status */}
                <div className="flex flex-col md:flex-row items-center gap-4 pt-4 border-t border-slate-700/50">
                    <span className="text-sm text-slate-400 font-medium">Verification Status:</span>
                    <div className="flex bg-slate-900/50 p-1 rounded-xl overflow-hidden border border-slate-700/50">
                        {['all', 'verified', 'unverified', 'rejected'].map(status => (
                            <button
                                key={status}
                                onClick={() => { setVerificationFilter(status); setCurrentPage(1); }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${
                                    verificationFilter === status
                                        ? status === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-lg'
                                        : status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/20 shadow-lg'
                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/20 shadow-lg'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}
                            >
                                {status === 'rejected' ? 'Banned' : status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700/50 bg-slate-800/80 text-sm text-slate-400 uppercase tracking-wider">
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Role</th>
                                <th className="p-4 font-medium">Verification</th>
                                <th className="p-4 font-medium">Joined</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user._id} className="group hover:bg-slate-800/40 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0">
                                                    {user.photoURL ? (
                                                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                                                            {user.fullName?.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-200">{user.fullName}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td className="p-4">
                                            {user.verificationStatus === 'verified' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                    <CheckCircle className="w-3 h-3" /> Verified
                                                </span>
                                            )}
                                            {user.verificationStatus === 'unverified' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                                    Unverified
                                                </span>
                                            )}
                                            {user.verificationStatus === 'pending' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                    Pending
                                                </span>
                                            )}
                                            {user.verificationStatus === 'rejected' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                                    <XCircle className="w-3 h-3" /> Banned
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-400">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* View Documents Button */}
                                                <button 
                                                    onClick={() => setViewingDocsUser(user)}
                                                    className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                                                    title="View Documents"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>

                                                <button 
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleBanUser(user._id, isBanned(user))}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        isBanned(user) 
                                                            ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' 
                                                            : 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10'
                                                    }`}
                                                    title={isBanned(user) ? "Unban User" : "Ban User"}
                                                >
                                                    {isBanned(user) ? <CheckCircle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                                </button>

                                                <button 
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete User"
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

            {/* Document Modal */}
             {viewingDocsUser && (
                <DocumentModal 
                    user={viewingDocsUser} 
                    onClose={() => setViewingDocsUser(null)} 
                />
            )}

            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={editingUser ? handleUpdateUser : handleCreateUser}
                />
            )}
        </div>
    );
}
