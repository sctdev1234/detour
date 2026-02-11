import { AlertCircle, Car, CheckCircle, Map, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';

const StatCard = ({ title, value, icon: Icon, color, trend, to }) => {
    const Content = (
        <div className={`p-6 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group h-full ${to ? 'cursor-pointer hover:bg-slate-800/80 transition-colors' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        </div>
    );

    return to ? (
        <Link to={to} className="block h-full">
            {Content}
        </Link>
    ) : (
        Content
    );
};

export default function DashboardHome() {
    const [stats, setStats] = useState({
        pendingDrivers: 0,
        totalUsers: 0,
        totalDrivers: 0,
        pendingWithdrawals: 0,
        activeTrips: 0,
        completedTrips: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/stats');
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Overview</h1>
            <p className="text-slate-400 mb-8">Welcome back. Here's what's happening today.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Pending Drivers"
                    value={loading ? '...' : stats.pendingDrivers}
                    icon={AlertCircle}
                    color="yellow"
                    to="/drivers"
                />
                <StatCard
                    title="Active Users"
                    value={loading ? '...' : stats.totalUsers}
                    icon={Users}
                    color="blue"
                    trend="+5.2%"
                    to="/users"
                />
                <StatCard
                    title="Active Trips"
                    value={loading ? '...' : stats.activeTrips}
                    icon={Map}
                    color="purple"
                    trend="+12%"
                    to="/trips"
                />
                <StatCard
                    title="Pending Payouts"
                    value={loading ? '...' : stats.pendingWithdrawals}
                    icon={TrendingUp}
                    color="emerald"
                    to="/credits"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Drivers"
                    value={loading ? '...' : stats.totalDrivers}
                    icon={Car}
                    color="indigo"
                    to="/drivers"
                />
                <StatCard
                    title="Completed Trips"
                    value={loading ? '...' : stats.completedTrips}
                    icon={CheckCircle}
                    color="green"
                    to="/trips"
                />
            </div>

            {/* Placeholder for Recent Activity Chart or Table */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl h-64 flex items-center justify-center text-slate-500">
                    User Growth Chart Placeholder
                </div>
                <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl h-64 flex items-center justify-center text-slate-500">
                    Recent Activity Placeholder
                </div>
            </div>
        </div>
    );
}
