import { CheckCircle, Clock, Navigation, XCircle } from 'lucide-react';

export default function TripsTable({ trips, onSelectTrip, selectedTripId, onFocusPoint, compact = false }) {
    return (
        <div className="space-y-4">
            {/* Table Header - Transparent & Minimal (Hidden in Compact Mode) */}
            {!compact && (
                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    <div className="col-span-2">Trip ID / Date</div>
                    <div className="col-span-2">Driver</div>
                    <div className="col-span-4">Route Path</div>
                    <div className="col-span-1 text-center">Price</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-1 text-right">Action</div>
                </div>
            )}

            {/* Floating Rows */}
            <div className={`space-y-3 ${compact ? 'px-1' : ''}`}>
                {trips.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border border-dashed border-slate-700/50 bg-slate-800/20 text-slate-500 backdrop-blur-sm">
                        No trips recorded yet.
                    </div>
                ) : (
                    trips.map(trip => {
                        const isSelected = selectedTripId === trip._id;

                        // Premium Compact Card Design
                        if (compact) {
                            return (
                                <div
                                    key={trip._id}
                                    onClick={() => onSelectTrip(trip)}
                                    className={`
                                        group relative flex flex-col gap-4 p-5
                                        rounded-2xl transition-all duration-300 cursor-pointer border
                                        ${isSelected
                                            ? 'bg-blue-600/10 border-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]'
                                            : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
                                        }
                                    `}
                                >
                                    {/* Active State Glow Bar */}
                                    {isSelected && <div className="absolute left-0 top-6 bottom-6 w-1 bg-blue-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>}

                                    {/* Header: Driver & Price */}
                                    <div className="flex justify-between items-start pl-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all shadow-lg">
                                                    {trip.driverId?.fullName?.[0] || '?'}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center">
                                                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${trip.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                                                    {trip.driverId?.fullName || 'Unknown Driver'}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-mono text-slate-500">#{trip._id.substring(0, 8)}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${trip.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            trip.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}>
                                                        {trip.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end">
                                            <span className="text-lg font-bold text-slate-100 tracking-tight">${trip.price}</span>
                                            <span className="text-[10px] text-slate-500 font-medium">{new Date(trip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>

                                    {/* Route Visual */}
                                    <div className="relative pl-3 pr-1 py-1">
                                        {/* Dotted Line */}
                                        <div className="absolute left-[24px] top-2 bottom-6 w-[2px] border-l-2 border-dotted border-slate-700/50"></div>

                                        <div className="space-y-4">
                                            {/* Pickup */}
                                            <div
                                                className="flex items-center gap-3 group/point"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectTrip(trip);
                                                    if (trip.routeId?.startPoint?.coordinates) {
                                                        onFocusPoint([trip.routeId.startPoint.coordinates[1], trip.routeId.startPoint.coordinates[0]]);
                                                    }
                                                }}
                                            >
                                                <div className="ml-1 w-2.5 h-2.5 rounded-full border-[2px] border-blue-500 bg-slate-900 shrink-0 z-10 shadow-[0_0_8px_rgba(59,130,246,0.5)] group-hover/point:scale-125 transition-transform"></div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Pickup</span>
                                                    <span className="text-xs text-slate-300 font-medium truncate w-full group-hover/point:text-blue-400 transition-colors">
                                                        {trip.routeId?.startPoint?.address || 'Location A'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Dropoff */}
                                            <div
                                                className="flex items-center gap-3 group/point"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectTrip(trip);
                                                    if (trip.routeId?.endPoint?.coordinates) {
                                                        onFocusPoint([trip.routeId.endPoint.coordinates[1], trip.routeId.endPoint.coordinates[0]]);
                                                    }
                                                }}
                                            >
                                                <div className="ml-1 w-2.5 h-2.5 rounded-full border-[2px] border-emerald-500 bg-slate-900 shrink-0 z-10 shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover/point:scale-125 transition-transform"></div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Dropoff</span>
                                                    <span className="text-xs text-slate-300 font-medium truncate w-full group-hover/point:text-emerald-400 transition-colors">
                                                        {trip.routeId?.endPoint?.address || 'Location B'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer / Actions - Only show on hover or selected */}
                                    <div className={`
                                        absolute right-4 bottom-4 transition-all duration-300 transform
                                        ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}
                                    `}>
                                        <button className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 transition-all active:scale-95">
                                            <Navigation className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        // Standard Table Row (Unchanged)
                        return (
                            <div
                                key={trip._id}
                                onClick={() => onSelectTrip(trip)}
                                className={`
                                    group relative grid grid-cols-12 gap-4 items-center px-6 py-5 
                                    rounded-2xl border transition-all duration-300 cursor-pointer
                                    ${isSelected
                                        ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]'
                                        : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-800/60 hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5'
                                    }
                                    backdrop-blur-md
                                `}
                            >
                                {/* Selection Indicator */}
                                {isSelected && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-l-2xl"></div>
                                )}

                                {/* ID & Date */}
                                <div className="col-span-2 flex flex-col gap-1">
                                    <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                                        #{trip._id.substring(0, 8)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        {new Date(trip.createdAt).toLocaleDateString()} • {new Date(trip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {/* Driver Info */}
                                <div className="col-span-2 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                        {trip.driverId?.fullName?.[0] || '?'}
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                                            {trip.driverId?.fullName || 'Unknown'}
                                        </span>
                                        <span className="text-xs text-slate-500 truncate">
                                            {trip.driverId?.email}
                                        </span>
                                    </div>
                                </div>

                                {/* Route Visualization - Interactive */}
                                <div className="col-span-4 relative">
                                    {/* Connecting Line - Centered behind dots */}
                                    <div className="absolute left-[19px] top-5 bottom-5 w-0.5 bg-gradient-to-b from-emerald-500/50 via-slate-700 to-red-500/50"></div>

                                    <div className="flex flex-col gap-1 relative z-10 text-xs">
                                        {/* Start - Clickable */}
                                        <div
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors group/point cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectTrip(trip);
                                                if (trip.routeId?.startPoint?.coordinates) {
                                                    onFocusPoint([trip.routeId.startPoint.coordinates[1], trip.routeId.startPoint.coordinates[0]]);
                                                }
                                            }}
                                            title="Click to focus on Start Point"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] group-hover/point:scale-125 transition-transform shrink-0"></div>
                                            <span className="text-slate-300 font-medium truncate w-full group-hover/point:text-emerald-400 transition-colors">
                                                {trip.routeId?.startPoint?.address || 'Pickup Location'}
                                            </span>
                                        </div>

                                        {/* End - Clickable */}
                                        <div
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors group/point cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectTrip(trip);
                                                if (trip.routeId?.endPoint?.coordinates) {
                                                    onFocusPoint([trip.routeId.endPoint.coordinates[1], trip.routeId.endPoint.coordinates[0]]);
                                                }
                                            }}
                                            title="Click to focus on End Point"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)] group-hover/point:scale-125 transition-transform shrink-0"></div>
                                            <span className="text-slate-300 font-medium truncate w-full group-hover/point:text-red-400 transition-colors">
                                                {trip.routeId?.endPoint?.address || 'Dropoff Location'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="col-span-1 text-center">
                                    <span className="inline-block px-3 py-1 rounded-lg bg-slate-900/50 text-emerald-400 font-bold text-sm border border-slate-700/50 shadow-inner">
                                        ${trip.price}
                                    </span>
                                </div>

                                {/* Status Badge */}
                                <div className="col-span-2 flex justify-center">
                                    <div className={`
                                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm
                                        ${trip.status === 'active'
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_-3px_rgba(59,130,246,0.3)]'
                                            : trip.status === 'completed'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-3px_rgba(16,185,129,0.3)]'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_-3px_rgba(239,68,68,0.3)]'
                                        }
                                    `}>
                                        {trip.status === 'active' && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                                        {trip.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                                        {trip.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                                        <span className="capitalize tracking-wide">{trip.status}</span>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="col-span-1 text-right">
                                    <div className={`p-2 rounded-xl transition-all duration-300 inline-block
                                        ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}
                                    `}>
                                        <Navigation className={`w-4 h-4 ${isSelected ? 'animate-bounce' : ''}`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
