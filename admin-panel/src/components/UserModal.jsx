import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Mail, Shield, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function UserModal({ user, onClose, onSave }) {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: 'client',
        // phone: '', // Enable if phone is supported
        password: '' // Only for create
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                role: user.role || 'client',
                // phone: user.phone || '',
                password: '' // Don't show password
            });
            setIsEditing(true);
        } else {
            setFormData({
                fullName: '',
                email: '',
                role: 'client',
                // phone: '',
                password: ''
            });
            setIsEditing(false);
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
                        <h2 className="text-xl font-bold text-white">
                            {isEditing ? 'Edit User' : 'Create New User'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        {/* Password (only for create) */}
                        {!isEditing && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required={!isEditing}
                                        minLength={6}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
                                >
                                    <option value="client">Client</option>
                                    <option value="driver">Driver</option>
                                    <option value="admin">Admin (Support)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                            >
                                {isEditing ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
