import { CheckCircle, Clock, Navigation, XCircle } from 'lucide-react';

export default function TripsTable({ trips, onSelectTrip, selectedTripId, onFocusPoint }) {
    return (
        <div className="space-y-4">
            {/* Table Header - Transparent & Minimal */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <div className="col-span-2">Trip ID / Date</div>
                <div className="col-span-2">Driver</div>
                <div className="col-span-4">Route Path</div>
                <div className="col-span-1 text-center">Price</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1 text-right">Action</div>
            </div>

            {/* Floating Rows */}
            <div className="space-y-3">
                {trips.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border border-dashed border-slate-700/50 bg-slate-800/20 text-slate-500 backdrop-blur-sm">
                        No trips recorded yet.
                    </div>
                ) : (
                    trips.map(trip => {
                        const isSelected = selectedTripId === trip._id;
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
