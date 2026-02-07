import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, FileText, User, X, XCircle } from 'lucide-react';

export default function DriverDetailModal({ driver, onClose, onApprove, onReject }) {
    if (!driver) return null;

    const documents = [
        { label: 'Profile Photo', value: driver.photoURL, type: 'image' },
        { label: 'CIN (Front)', value: driver.documents?.cinFront, type: 'image' },
        { label: 'CIN (Back)', value: driver.documents?.cinBack, type: 'image' },
        { label: 'Driving License', value: driver.documents?.license, type: 'image' },
        { label: 'Face Verification', value: driver.documents?.facePhoto, type: 'image' },
    ].filter(doc => doc.value); // Only show existing docs

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-4xl max-h-[90vh] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden">
                                {driver.photoURL ? (
                                    <img src={driver.photoURL} alt={driver.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-lg">
                                        {driver.fullName?.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{driver.fullName}</h2>
                                <p className="text-sm text-slate-400">{driver.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-600">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Info Column */}
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Personal Details
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <span className="text-slate-500 block">Full Name</span>
                                            <span className="text-slate-200">{driver.fullName}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">Email</span>
                                            <span className="text-slate-200">{driver.email}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">Phone</span>
                                            <span className="text-slate-200">{driver.phone || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">Joined Date</span>
                                            <span className="text-slate-200">
                                                {new Date(driver.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">ID</span>
                                            <span className="font-mono text-slate-400 text-xs">{driver._id}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents grid */}
                            <div className="lg:col-span-2">
                                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Submitted Documents
                                </h3>

                                {documents.length === 0 ? (
                                    <div className="p-8 text-center border border-dashed border-slate-700 rounded-xl">
                                        <p className="text-slate-500">No documents uploaded.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {documents.map((doc, index) => (
                                            <div key={index} className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900/50">
                                                <div className="aspect-video bg-slate-800 relative cursor-pointer hover:opacity-90 transition-opacity">
                                                    {/* In a real app, clicking opens a lightbox. For now basic img. */}
                                                    <img
                                                        src={doc.value}
                                                        alt={doc.label}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                </div>
                                                <div className="p-3 bg-slate-800/80 backdrop-blur absolute bottom-0 w-full">
                                                    <p className="text-xs font-medium text-slate-200">{doc.label}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
                        {driver.verificationStatus === 'pending' ? (
                            <>
                                <button
                                    onClick={() => onReject(driver._id)}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Reject Application
                                </button>
                                <button
                                    onClick={() => onApprove(driver._id)}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Approve Driver
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => onBan(driver._id)}
                                disabled={driver.verificationStatus === 'rejected'}
                                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XCircle className="w-5 h-5" />
                                {driver.verificationStatus === 'rejected' ? 'Banned' : 'Ban Driver'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
