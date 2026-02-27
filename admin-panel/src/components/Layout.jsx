import {
    Bell,
    Car,
    CarFront,
    CreditCard,
    DollarSign,
    FileText,
    LayoutDashboard,
    LogOut,
    Map,
    MessageSquare,
    Star,
    Tag,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../lib/axios';

export default function Layout() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [socket, setSocket] = useState(null);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await api.get('/notifications');
                setNotifications(res.data);
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };
        fetchNotifications();

        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);

        newSocket.on('new_notification', (notification) => {
            console.log('Received new notification:', notification);
            setNotifications(prev => [notification, ...prev]);
        });

        // We can still listen to other events if needed for other UI updates, 
        // but for the bell icon, we rely on 'new_notification'

        return () => newSocket.close();
    }, []);


    useEffect(() => {
        // Add animation keyframes for content fade-in
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; margin-top: 10px; }
                to { opacity: 1; margin-top: 0; }
            }
            .animate-fadeIn {
                animation: fadeIn 0.4s ease-out forwards;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const handleNotificationClick = async (notif) => {
        setShowNotifications(false);
        // Remove notification from UI immediately
        setNotifications(prev => prev.filter(n => n._id !== notif._id));

        // Mark as read in backend if it has a real DB ID (string)
        if (typeof notif._id === 'string' && notif._id.length === 24) { // Assuming MongoDB _id length
            try {
                await api.put(`/notifications/${notif._id}/read`);
            } catch (err) {
                console.error("Failed to mark notification as read:", err);
            }
        }

        // Navigate to support and potentially to the specific ticket
        if (notif.data && notif.data.reclamationId) {
            navigate(`/support?ticketId=${notif.data.reclamationId}`);
        } else {
            navigate('/support');
        }
    };

    const handleClearAll = async () => {
        setNotifications([]); // Clear from UI
        try {
            await api.put('/notifications/read-all'); // Mark all as read in backend
        } catch (err) {
            console.error("Failed to clear all notifications:", err);
        }
    };

    const navItems = [
        { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/requests', label: 'Requests History', icon: FileText },
        { path: '/drivers', label: 'Verifications', icon: Car },
        { path: '/cars', label: 'Cars', icon: CarFront },
        { path: '/places', label: 'Places', icon: Map },
        { path: '/subscriptions', label: 'Abonnements', icon: CreditCard },
        { path: '/coupons', label: 'Coupons', icon: Tag },
        { path: '/credits', label: 'Finance', icon: DollarSign },
        { path: '/users', label: 'Users', icon: Users },
        { path: '/reviews', label: 'Reviews', icon: Star },
        { path: '/support', label: 'Support', icon: MessageSquare },
    ];

    return (
        <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 z-50 transition-all flex flex-col">
                <div className="flex items-center gap-3 px-6 py-8 border-b border-slate-800/50 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                        D
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Admin Portal
                    </span>
                </div>

                <nav className="p-4 space-y-2 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                                ${isActive
                                    ? 'bg-blue-600/10 text-blue-400 shadow-inner border border-blue-500/10'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
                            `}
                        >
                            <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                            <span className="font-medium text-sm">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800/50 shrink-0">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 group border border-transparent hover:border-red-500/10"
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium text-sm">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 p-8 relative overflow-hidden">
                {/* Background ambient glow */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
                    <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-3xl"></div>
                </div>

                {/* Header */}
                <header className="mb-8 flex justify-end items-center relative z-20">
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors relative"
                        >
                            <Bell className="w-5 h-5" />
                            {notifications.length > 0 && (
                                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-4 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                                    <h3 className="font-bold text-white">Notifications</h3>
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={handleClearAll}
                                            className="text-xs text-slate-400 hover:text-white"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">
                                            No new notifications
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-700/50">
                                            {notifications.map(notif => (
                                                <div
                                                    key={notif._id}
                                                    onClick={() => handleNotificationClick(notif)}
                                                    className="p-4 hover:bg-slate-700/50 cursor-pointer transition-colors"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notif.type === 'new_ticket' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-200">{notif.title}</div>
                                                            <div className="text-xs text-slate-400 mt-1">{notif.message}</div>
                                                            <div className="text-[10px] text-slate-500 mt-2">{new Date(notif.createdAt).toLocaleTimeString()}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <div className="max-w-7xl mx-auto animate-fadeIn">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}


