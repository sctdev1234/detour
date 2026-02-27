import { ArrowLeft, ChevronLeft, ChevronRight, Star, Trash2, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/axios';

export default function Reviews() {
    // Top-level state
    const [view, setView] = useState('users'); // 'users' or 'details'
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Users List State
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    // User Details State
    const [userDetails, setUserDetails] = useState(null);
    const [userReviewsGiven, setUserReviewsGiven] = useState([]);
    const [userReviewsReceived, setUserReviewsReceived] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [activeTab, setActiveTab] = useState('received'); // 'received' or 'given'

    useEffect(() => {
        if (view === 'users') {
            fetchUsersList();
        } else if (view === 'details' && selectedUserId) {
            fetchUserDetails(selectedUserId);
        }
    }, [view, currentPage, selectedUserId, roleFilter]);

    // Handle search debounce
    useEffect(() => {
        if (view === 'users') {
            const delay = setTimeout(() => {
                setCurrentPage(1);
                fetchUsersList();
            }, 500);
            return () => clearTimeout(delay);
        }
    }, [searchTerm]);

    const fetchUsersList = async () => {
        setLoadingUsers(true);
        try {
            const params = {
                page: currentPage,
                limit: 10,
                search: searchTerm,
                role: roleFilter
            };
            const res = await api.get('/admin/reviews/users', { params });
            setUsers(res.data.users);
            setTotalPages(res.data.totalPages);
            setTotalUsers(res.data.totalUsers);
            setCurrentPage(res.data.currentPage);
        } catch (err) {
            console.error("Failed to fetch grouped users", err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchUserDetails = async (userId) => {
        setLoadingDetails(true);
        try {
            const res = await api.get(`/admin/reviews/user/${userId}`);
            setUserDetails(res.data.user);
            setUserReviewsGiven(res.data.reviewsGiven);
            setUserReviewsReceived(res.data.reviewsReceived);
        } catch (err) {
            console.error("Failed to fetch user details", err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDeleteReview = async (id, type) => {
        if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;
        try {
            await api.delete(`/admin/reviews/${id}`);
            // Optimistic UI update
            if (type === 'given') {
                setUserReviewsGiven(prev => prev.filter(r => r._id !== id));
            } else {
                setUserReviewsReceived(prev => prev.filter(r => r._id !== id));
            }
        } catch (err) {
            alert('Failed to delete review');
            console.error(err);
        }
    };

    const openUserDetails = (userId) => {
        setSelectedUserId(userId);
        setView('details');
        setActiveTab('received');
    };

    const goBackToUsers = () => {
        setView('users');
        setSelectedUserId(null);
        fetchUsersList(); // Refresh counts
    };

    const renderStars = (rating) => {
        return (
            <div className="flex bg-slate-800/50 px-2 py-1 rounded-lg w-fit">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                    />
                ))}
            </div>
        );
    };

    if (view === 'details') {
        return (
            <div className="p-4 sm:p-8 animate-fadeIn max-w-[1600px] mx-auto">
                <button
                    onClick={goBackToUsers}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group px-4 py-2 bg-slate-800 rounded-xl w-fit"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Back to Users View
                </button>

                {loadingDetails || !userDetails ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-xl">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-400">Loading user details...</p>
                    </div>
                ) : (
                    <>
                        {/* User Profile Summary */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8 flex items-center gap-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                            <div className="w-20 h-20 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center shrink-0 border-2 border-slate-600">
                                {userDetails.photoURL ? (
                                    <img src={userDetails.photoURL} alt={userDetails.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-10 h-10 text-slate-400" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white tracking-tight">{userDetails.fullName}</h1>
                                <p className="text-slate-400 text-sm mt-1">{userDetails.email}</p>
                                <div className="mt-3 flex gap-4 text-sm font-medium">
                                    <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 shadow-sm shadow-blue-500/10">
                                        {userReviewsReceived.length} Received
                                    </span>
                                    <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 shadow-sm shadow-purple-500/10">
                                        {userReviewsGiven.length} Given
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-4 mb-6 border-b border-slate-700/50 pb-2">
                            <button
                                onClick={() => setActiveTab('received')}
                                className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'received' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Reviews Received by {userDetails.fullName.split(' ')[0]}
                                {activeTab === 'received' && (
                                    <div className="absolute bottom-[-9px] left-0 w-full h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_10px_theme('colors.blue.500')]"></div>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('given')}
                                className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'given' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Reviews Given by {userDetails.fullName.split(' ')[0]}
                                {activeTab === 'given' && (
                                    <div className="absolute bottom-[-9px] left-0 w-full h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_10px_theme('colors.blue.500')]"></div>
                                )}
                            </button>
                        </div>

                        {/* Reviews List */}
                        <div className="space-y-4">
                            {(activeTab === 'received' ? userReviewsReceived : userReviewsGiven).length === 0 ? (
                                <div className="p-12 text-center text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-inner">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Star className="w-12 h-12 text-slate-600 mb-2" />
                                        <p className="text-xl font-medium text-slate-300">No reviews {activeTab === 'received' ? 'received' : 'given'} yet</p>
                                        <p className="text-sm">When users leave reviews, they will appear here.</p>
                                    </div>
                                </div>
                            ) : (
                                (activeTab === 'received' ? userReviewsReceived : userReviewsGiven).map((review) => {
                                    const otherPerson = activeTab === 'received' ? review.reviewerId : review.revieweeId;
                                    return (
                                        <div key={review._id} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-colors group shadow-lg backdrop-blur-sm">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        {renderStars(review.rating)}
                                                        <span className="text-sm text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-200 text-base leading-relaxed mb-5 border-l-2 border-blue-500/30 pl-4 py-1">
                                                        "{review.comment}"
                                                    </p>
                                                    <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-xl w-fit border border-slate-800/50">
                                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600">
                                                            <UserIcon className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                        <div className="text-sm">
                                                            <span className="text-slate-500 mr-2">{activeTab === 'received' ? 'Reviewer:' : 'Reviewed User:'}</span>
                                                            <span className="font-semibold text-blue-400">
                                                                {otherPerson ? otherPerson.fullName : 'Unknown User'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteReview(review._id, activeTab)}
                                                    className="p-2.5 bg-slate-900/50 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700 hover:border-red-500 shadow-sm shrink-0"
                                                    title="Delete Review"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 animate-fadeIn max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Star className="w-8 h-8 text-yellow-400 fill-yellow-400/20" />
                        Reviews Management
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm sm:text-base">
                        Select a user to view their received and given reviews. Involved Users: <span className="text-blue-400 font-semibold">{totalUsers}</span>
                    </p>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 mb-6 shadow-xl backdrop-blur-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:max-w-md bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 shadow-inner block"
                />

                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700 w-full sm:w-auto self-end">
                    {['all', 'client', 'driver'].map((role) => (
                        <button
                            key={role}
                            onClick={() => {
                                setRoleFilter(role);
                                setCurrentPage(1);
                            }}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize
                                    ${roleFilter === role
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                        >
                            {role === 'all' ? 'All Roles' : role + 's'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm relative min-h-[400px]">
                {loadingUsers ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin shadow-lg shadow-blue-500/20"></div>
                        <p className="mt-4 text-slate-400 animate-pulse font-medium">Loading users...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/80 border-b border-slate-700/50">
                                        <th className="p-4 text-sm font-semibold text-slate-300">User Profile</th>
                                        <th className="p-4 text-sm font-semibold text-slate-300 text-center">Avg Rating Received</th>
                                        <th className="p-4 text-sm font-semibold text-slate-300 text-center">Reviews Received</th>
                                        <th className="p-4 text-sm font-semibold text-slate-300 text-center">Reviews Given</th>
                                        <th className="p-4 text-sm font-semibold text-slate-300 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                                                        <UserIcon className="w-8 h-8 text-slate-600" />
                                                    </div>
                                                    <p className="text-xl font-medium text-slate-300">No users found</p>
                                                    <p className="text-sm">Try adjusting your search query or no reviews exist yet.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user._id} className="border-b border-slate-700/30 hover:bg-slate-700/40 transition-colors group cursor-pointer" onClick={() => openUserDetails(user._id)}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center border-2 border-slate-600 group-hover:border-blue-500/50 transition-colors">
                                                            {user.photoURL ? (
                                                                <img src={user.photoURL} alt={user.fullName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <UserIcon className="w-6 h-6 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors text-base">{user.fullName}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Star className={`w-4 h-4 ${user.stats.avgRatingReceived > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                                                        <span className="text-sm font-medium text-slate-300">
                                                            {user.stats.avgRatingReceived > 0 ? user.stats.avgRatingReceived : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 w-12">
                                                        {user.stats.receivedCount}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 w-12">
                                                        {user.stats.givenCount}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openUserDetails(user._id); }}
                                                        className="px-4 py-2 bg-slate-800 group-hover:bg-blue-600 text-sm font-medium text-slate-300 group-hover:text-white rounded-xl transition-all shadow-sm group-hover:shadow-blue-500/20 group-hover:scale-105"
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-slate-700/50 bg-slate-900/30 flex items-center justify-between">
                                <span className="text-sm text-slate-400">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50 disabled:hover:bg-slate-800 transition-colors border border-slate-700/50 shadow-sm"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50 disabled:hover:bg-slate-800 transition-colors border border-slate-700/50 shadow-sm"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
