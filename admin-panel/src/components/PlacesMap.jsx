import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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

export default function PlacesMap({ places, onLocationSelect, selectedLocation, center, isFullScreen, onToggleFullScreen }) {
    // Default center (Casablanca)
    const defaultCenter = [33.5731, -7.5898];
    const [mapStyle, setMapStyle] = useState('street'); // Default to street view for places
    const [showStyleMenu, setShowStyleMenu] = useState(false);

    const mapStyles = {
        dark: {
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            label: "Dark Mode"
        },
        light: {
            url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            label: "Light Mode"
        },
        street: {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            label: "Street View"
        },
        satellite: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            label: "Satellite"
        }
    };

    return (
        <div className={`w-full rounded-xl overflow-hidden border border-slate-700/50 relative z-0 transition-all duration-500 ${isFullScreen ? 'h-full rounded-none border-0' : 'h-[400px]'}`}>

            {/* Map Style Switcher */}
            <div className="absolute top-4 right-16 z-[400]">
                <button
                    onClick={() => setShowStyleMenu(!showStyleMenu)}
                    className={`p-3 rounded-xl backdrop-blur-md border transition-all duration-300 shadow-2xl group ${showStyleMenu ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'}`}
                    title="Change Map Style"
                >
                    <Layers className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                <div className={`absolute top-full right-0 mt-2 w-40 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 origin-top-right ${showStyleMenu ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
                    <div className="p-1 space-y-1">
                        {Object.entries(mapStyles).map(([key, style]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setMapStyle(key);
                                    setShowStyleMenu(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${mapStyle === key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${mapStyle === key ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toggle Full Screen Button - Only show if toggle function provided */}
            {onToggleFullScreen && (
                <button
                    onClick={onToggleFullScreen}
                    className="absolute top-4 right-4 z-[400] p-3 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all duration-300 shadow-2xl group"
                    title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                >
                    {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
            )}

            <MapContainer
                center={center || defaultCenter}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    url={mapStyles[mapStyle].url}
                    attribution={mapStyles[mapStyle].attribution}
                />

                {/* Existing Places Markers */}
                {places.map((place) => {
                    if (place.latitude && place.longitude) {
                        const userPhoto = place.user?.photoURL || null;
                        const defaultAvatar = `https://ui-avatars.com/api/?name=${place.user?.fullName || 'User'}&background=0D8ABC&color=fff`;

                        // Create a unique ID for the custom marker icon to avoid conflicts
                        // We construct the HTML string for the divIcon
                        const iconHtml = `
                            <div style="position: relative; width: 48px; height: 56px; display: flex; flex-direction: column; align-items: center;">
                                <div style="
                                    width: 48px; 
                                    height: 48px; 
                                    border-radius: 50%; 
                                    border: 3px solid white; 
                                    background-color: #f1f5f9;
                                    background-image: url('${userPhoto || defaultAvatar}');
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
                        `;

                        const customIcon = L.divIcon({
                            className: 'custom-avatar-marker',
                            html: iconHtml,
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
                                                src={userPhoto || defaultAvatar}
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
