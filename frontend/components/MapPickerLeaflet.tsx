import L from 'leaflet';
import { Car, Navigation, Star, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import { LatLng } from '../store/useTripStore';

// Inject Leaflet CSS
const LeafletStyles = () => {
    useEffect(() => {
        const styleId = 'leaflet-css';
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
    }, []);
    return null;
};

interface MapPickerProps {
    onPointsChange?: (points: LatLng[]) => void;
    initialPoints?: LatLng[];
    theme: any;
    driverLocation?: { latitude: number; longitude: number; heading: number };
    readOnly?: boolean;
}

// Helper to handle map clicks
const MapEvents = ({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) => {
    useMapEvents({
        click: onMapClick,
    });
    return null;
};

// Helper to update map center
const MapUpdater = ({ center }: { center?: LatLng }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo([center.latitude, center.longitude], map.getZoom());
        }
    }, [center, map]);
    return null;
};

// Default export for dynamic import
export default function MapPickerLeaflet({ onPointsChange, initialPoints = [], theme, driverLocation, readOnly = false }: MapPickerProps) {
    const { location } = useLocationStore();
    const { user } = useAuthStore();
    const [points, setPoints] = useState<LatLng[]>(initialPoints);
    const [mapCenter, setMapCenter] = useState<LatLng | undefined>(undefined);

    useEffect(() => {
        if (initialPoints && initialPoints.length > 0) {
            setPoints(initialPoints);
        }
    }, [initialPoints]);

    useEffect(() => {
        if (driverLocation) {
            // Optional: Auto-pan to driver
            // setMapCenter({ latitude: driverLocation.latitude, longitude: driverLocation.longitude });
        }
    }, [driverLocation]);

    const handleMapClick = (e: L.LeafletMouseEvent) => {
        if (readOnly) return;
        const newPoint = { latitude: e.latlng.lat, longitude: e.latlng.lng };
        const newPoints = [...points, newPoint];
        setPoints(newPoints);
        onPointsChange && onPointsChange(newPoints);
    };

    const clearPoints = () => {
        setPoints([]);
        onPointsChange && onPointsChange([]);
    };

    const centerToMyLocation = () => {
        if (location) {
            setMapCenter({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        } else {
            console.log("No location available from store, trying browser geolocation");
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setMapCenter({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                        });
                    },
                    (err) => console.error(err)
                );
            }
        }
    };

    // Custom Icons generators
    const createNumberIcon = (number: number, color: string) => {
        const html = `
        <div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
            <span style="color: white; font-size: 10px; font-weight: bold; font-family: sans-serif;">${number}</span>
        </div>`;

        return L.divIcon({
            html: html,
            className: '', // Remove default leaflet class to avoid extra padding/borders
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });
    };

    const createStarIcon = () => {
        const iconMarkup = renderToStaticMarkup(<Star size={16} color="#FFD700" fill="#FFD700" />);
        const html = `
        <div style="
            background-color: ${theme.surface || '#fff'};
            width: 32px;
            height: 32px;
            border-radius: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 2px solid #FFD700;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
            ${iconMarkup}
        </div>`;
        return L.divIcon({
            html: html,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });
    };

    const createCarIcon = (rotation: number) => {
        const iconMarkup = renderToStaticMarkup(<Car size={20} color="#fff" />);
        const html = `
        <div style="
            background-color: ${theme.primary || '#007AFF'};
            width: 32px;
            height: 32px;
            border-radius: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transform: rotate(${rotation}deg);
        ">
            ${iconMarkup}
        </div>`;
        return L.divIcon({
            html: html,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });
    };

    // Default center (Casablanca)
    const defaultCenter: [number, number] = [33.5731, -7.5898];

    return (
        <View style={styles.container}>
            <LeafletStyles />
            {/* 
                We use a div to wrap MapContainer to ensure it takes height, 
                as React Native View might handle layout differently than what Leaflet expects.
                However, MapContainer needs explicit height.
            */}
            <div style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <MapContainer
                    center={defaultCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false} // We can add custom controls or leave default. Mobile app usually hides them or has custom ones.
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapEvents onMapClick={handleMapClick} />
                    <MapUpdater center={mapCenter} />

                    {/* Saved Places */}
                    {user?.savedPlaces?.map((place, index) => (
                        <Marker
                            key={`saved-${index}`}
                            position={[place.latitude, place.longitude]}
                            icon={createStarIcon()}
                            eventHandlers={{
                                click: () => {
                                    if (readOnly) return;
                                    const newPoint = { latitude: place.latitude, longitude: place.longitude };
                                    const newPoints = [...points, newPoint];
                                    setPoints(newPoints);
                                    onPointsChange && onPointsChange(newPoints);
                                }
                            }}
                        >
                            <Popup>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontWeight: 'bold', color: theme.text || '#000' }}>{place.label}</span><br />
                                    <span style={{ fontSize: '10px', color: '#666' }}>Tap to add to route</span>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Route Points */}
                    {points.map((point, index) => {
                        const color = index === 0 ? '#4CD964' : index === points.length - 1 ? '#FF3B30' : '#007AFF';
                        return (
                            <Marker
                                key={`point-${index}`}
                                position={[point.latitude, point.longitude]}
                                icon={createNumberIcon(index + 1, color)}
                                draggable={!readOnly}
                                eventHandlers={{
                                    dragend: (e) => {
                                        if (readOnly) return;
                                        const marker = e.target;
                                        const position = marker.getLatLng();
                                        const newPoints = [...points];
                                        newPoints[index] = { latitude: position.lat, longitude: position.lng };
                                        setPoints(newPoints);
                                        onPointsChange && onPointsChange(newPoints);
                                    },
                                    click: () => {
                                        if (readOnly) return;
                                    }
                                }}
                            >
                                <Popup>
                                    <div
                                        style={{ cursor: 'pointer', color: '#ff4444', fontWeight: 'bold' }}
                                        onClick={() => {
                                            if (readOnly) return;
                                            const newPoints = points.filter((_, i) => i !== index);
                                            setPoints(newPoints);
                                            onPointsChange && onPointsChange(newPoints);
                                        }}
                                    >
                                        Delete Point
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Driver Location */}
                    {driverLocation && (
                        <Marker
                            position={[driverLocation.latitude, driverLocation.longitude]}
                            icon={createCarIcon(driverLocation.heading)}
                        />
                    )}

                    {/* Polyline */}
                    {points.length > 1 && (
                        <Polyline
                            positions={points.map(p => [p.latitude, p.longitude])}
                            pathOptions={{ color: theme.primary || '#007AFF', weight: 4, opacity: 0.8 }}
                        />
                    )}

                </MapContainer>
            </div>

            <View style={styles.controls}>
                <View style={styles.leftControls}>
                    {points.length > 0 && (
                        <TouchableOpacity
                            style={[styles.controlButton, { backgroundColor: theme.accent || '#ff4444' }]}
                            onPress={clearPoints}
                        >
                            <Trash2 size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.controlButton, { backgroundColor: theme.primary || '#007AFF' }]}
                        onPress={centerToMyLocation}
                    >
                        <Navigation size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={[styles.infoBox, { backgroundColor: theme.surface || '#fff', borderColor: theme.border || '#ccc' }]}>
                    <Text style={[styles.infoText, { color: theme.text || '#000' }]}>
                        {points.length === 0 ? 'Click map to set Start Point' :
                            points.length === 1 ? 'Click map to set End Point' :
                                `Route with ${points.length} points`}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 480, // Match wrapper height
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
        position: 'relative',
        backgroundColor: '#e5e3df', // Leaflet background color
    },
    controls: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
    },
    leftControls: {
        flexDirection: 'row',
        gap: 8,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        // @ts-ignore
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
        cursor: 'pointer', // Web specific
    },
    infoBox: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 22,
        borderWidth: 1,
        elevation: 4,
        // @ts-ignore
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
    },
    infoText: {
        fontWeight: '700',
        fontSize: 12,
    },
});
