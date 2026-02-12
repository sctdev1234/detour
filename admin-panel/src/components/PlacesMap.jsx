import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';

// Fix for default marker icon not showing
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });
    return null;
}

function MapUpdater({ center }) {
    const map = useMapEvents({});
    useEffect(() => {
        if (center) {
            map.flyTo(center, 13);
        }
    }, [center, map]);
    return null;
}

export default function PlacesMap({ places, onLocationSelect, selectedLocation, center }) {
    // Default center (Casablanca)
    const defaultCenter = [33.5731, -7.5898];

    return (
        <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-700/50 relative z-0">
            <MapContainer
                center={center || defaultCenter}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Existing Places Markers */}
                {/* Existing Places Markers */}
                {places.map((place) => {
                    if (place.latitude && place.longitude) {
                        const userPhoto = place.user?.photoURL || null;

                        const customIcon = L.divIcon({
                            className: 'custom-avatar-marker',
                            html: `
                                <div style="position: relative; width: 48px; height: 56px; display: flex; flex-direction: column; align-items: center;">
                                    <div style="
                                        width: 48px; 
                                        height: 48px; 
                                        border-radius: 50%; 
                                        border: 3px solid white; 
                                        background-color: #f1f5f9;
                                        background-image: url('${userPhoto || 'https://ui-avatars.com/api/?name=' + (place.user?.fullName || 'User') + '&background=0D8ABC&color=fff'}');
                                        background-size: cover;
                                        background-position: center;
                                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.2);
                                        z-index: 20;
                                        position: relative;
                                    "></div>
                                    <div style="
                                        width: 0; 
                                        height: 0; 
                                        border-left: 8px solid transparent;
                                        border-right: 8px solid transparent;
                                        border-top: 12px solid white;
                                        margin-top: -4px;
                                        filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.1));
                                        z-index: 10;
                                    "></div>
                                </div>
                            `,
                            iconSize: [48, 56],
                            iconAnchor: [24, 56], // Point of the arrow
                            popupAnchor: [0, -60]
                        });

                        return (
                            <Marker
                                key={place._id}
                                position={[place.latitude, place.longitude]}
                                icon={customIcon}
                            >
                                <Popup className="custom-popup">
                                    <div className="p-1 min-w-[200px]">
                                        {/* User Info Header */}
                                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                                            <img
                                                src={userPhoto || `https://ui-avatars.com/api/?name=${place.user?.fullName || 'User'}&background=0D8ABC&color=fff`}
                                                alt="User"
                                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                            />
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">{place.user?.fullName || 'Unknown User'}</h4>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium capitalize">
                                                    {place.user?.role || 'User'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Place Info */}
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-slate-900 text-base">{place.label || place.name}</h3>
                                            <p className="text-slate-500 text-xs flex items-start gap-1">
                                                <span className="shrink-0 mt-0.5">📍</span>
                                                {place.address}
                                            </p>
                                            <p className="text-slate-400 text-xs mt-1">
                                                Added: {new Date(place.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    }
                    return null;
                })}

                {/* Selected Location Marker (for adding new place) */}
                {selectedLocation && (
                    <Marker position={selectedLocation}>
                        <Popup>Selected Location</Popup>
                    </Marker>
                )}

                {/* Event Handler for Map Clicks */}
                {onLocationSelect && <LocationMarker onLocationSelect={onLocationSelect} />}

                {/* Auto-center map */}
                <MapUpdater center={center} />
            </MapContainer>
        </div>
    );
}
