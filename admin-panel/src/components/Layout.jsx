import {
    Car,
    CreditCard,
    DollarSign,
    LayoutDashboard,
    LogOut,
    Map,
    MessageSquare,
    Tag,
    Users
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function Layout() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/drivers', label: 'Verifications', icon: Car },
        { path: '/places', label: 'Places', icon: Map },
        { path: '/subscriptions', label: 'Abonnements', icon: CreditCard },
        { path: '/coupons', label: 'Coupons', icon: Tag },
        { path: '/credits', label: 'Finance', icon: DollarSign },
        { path: '/users', label: 'Users', icon: Users },
        { path: '/support', label: 'Support', icon: MessageSquare },
    ];

    return (
        <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 z-50 transition-all">
                <div className="flex items-center gap-3 px-6 py-8 border-b border-slate-800/50">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                        D
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Admin Portal
                    </span>
                </div>

                <nav className="p-4 space-y-2 mt-4">
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

                <div className="absolute bottom-8 left-0 w-full px-4">
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

                {/* Header (Optional, for page title) */}
                <header className="mb-8 flex justify-between items-center">
                    {/* Breadcrumbs or dynamic title could go here */}
                </header>

                <div className="max-w-7xl mx-auto animate-fadeIn">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

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
