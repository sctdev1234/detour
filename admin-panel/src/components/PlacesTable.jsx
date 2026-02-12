import { Calendar, MapPin, Trash2, User } from 'lucide-react';

export default function PlacesTable({ places, onDelete, onLocationClick, currentPage, totalPages, onPageChange }) {
    if (places.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300">No places found</h3>
                <p className="text-slate-500">Add common destinations like Airports, Stations, etc.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm flex flex-col h-full">
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-700/50 bg-slate-800/50">
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Place Name</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Address</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Category</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Added By</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Date Added</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {places.map((place) => (
                            <tr key={place._id} className="hover:bg-slate-700/30 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div className="font-medium text-slate-200">{place.label || place.name}</div>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-400 text-sm max-w-[200px] truncate" title={place.address}>
                                    {place.address}
                                </td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 capitalize">
                                        {place.category || 'other'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                                        <User className="w-4 h-4 text-slate-500" />
                                        <span>{place.user?.fullName || 'Unknown'}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Calendar className="w-4 h-4 text-slate-600" />
                                        {new Date(place.createdAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {(place.latitude && place.longitude) ? (
                                            <button
                                                onClick={() => onLocationClick(place)}
                                                className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                                                title="View on Map"
                                            >
                                                <MapPin className="w-4 h-4" />
                                            </button>
                                        ) : null}
                                        <button
                                            onClick={() => onDelete(place._id)}
                                            className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                            title="Delete Place"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="border-t border-slate-700/50 p-4 flex items-center justify-between bg-slate-800/30">
                    <div className="text-sm text-slate-400">
                        Page <span className="font-medium text-slate-300">{currentPage}</span> of <span className="font-medium text-slate-300">{totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-slate-300 transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-slate-300 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
