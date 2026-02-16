import L from 'leaflet';
import { Briefcase, Car, Dumbbell, GraduationCap, Home, MapPin, Navigation, Star, Trash2, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { renderToStaticMarkup } from 'react-dom/server';

import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import { LatLng } from '../types';
import { decodePolyline } from '../utils/location';
import { getAllPointsFromTrip, optimizeRoute, RoutePoint } from '../utils/mapUtils';
import { MapProps } from './Map';

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

// Helper to fit bounds
const MapBoundsUpdater = ({ points, edgePadding }: { points: LatLng[], edgePadding?: { top: number; right: number; bottom: number; left: number } }) => {
    const map = useMap();

    useEffect(() => {
        if (points.length > 0) {
            const validPoints = points.filter(p =>
                p &&
                typeof p.latitude === 'number' && !isNaN(p.latitude) &&
                typeof p.longitude === 'number' && !isNaN(p.longitude)
            );
            if (validPoints.length > 0) {
                const bounds = L.latLngBounds(validPoints.map(p => [p.latitude, p.longitude]));
                if (bounds.isValid()) {
                    const padding = edgePadding
                        ? [edgePadding.top, edgePadding.right] // Leaflet uses [topleft, bottomright] or point, but simple padding option is [x, y] or specific keys.
                        // Actually Leaflet fitBounds options: paddingBottomRight, paddingTopLeft.
                        : [60, 60];

                    const options: L.FitBoundsOptions = {};
                    if (edgePadding) {
                        options.paddingTopLeft = [edgePadding.left, edgePadding.top];
                        options.paddingBottomRight = [edgePadding.right, edgePadding.bottom];
                    } else {
                        options.padding = [60, 60];
                    }

                    map.fitBounds(bounds, options);
                }
            }
        }
    }, [points, map, edgePadding]);

    return null;
};

// Helper to handle map clicks for Picker
const MapEvents = ({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) => {
    useMapEvents({
        click: onMapClick,
    });
    return null;
};

// Map Updater for manual center changes
const MapCenterUpdater = ({ center }: { center?: LatLng }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo([center.latitude, center.longitude], map.getZoom());
        }
    }, [center, map]);
    return null;
};

// --- Icon Helpers (moved outside to prevent recreation) ---
const createIcon = (html: string, size: number = 32) => {
    return L.divIcon({
        html: html,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};

const createDotIcon = (color: string) => {
    const html = `
    <div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 6px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`;
    return createIcon(html, 12);
};

const createStarIcon = (theme: any) => {
    const iconMarkup = renderToStaticMarkup(<Star size={16} color="#FFD700" fill="#FFD700" />);
    const html = `
    <div style="background-color: ${theme.surface || '#fff'}; width: 32px; height: 32px; border-radius: 16px; display: flex; justify-content: center; align-items: center; border: 2px solid #FFD700; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        ${iconMarkup}
    </div>`;
    return createIcon(html, 32);
};

const createNumberIcon = (number: number, color: string) => {
    const html = `
    <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 12px; display: flex; justify-content: center; align-items: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <span style="color: white; font-size: 10px; font-weight: bold; font-family: sans-serif;">${number}</span>
    </div>`;
    return createIcon(html, 24);
};

const createCarIcon = (rotation: number, theme: any) => {
    const iconMarkup = renderToStaticMarkup(<Car size={20} color="#fff" />);
    const html = `
    <div style="background-color: ${theme.primary || '#007AFF'}; width: 32px; height: 32px; border-radius: 16px; display: flex; justify-content: center; align-items: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transform: rotate(${rotation}deg);">
        ${iconMarkup}
    </div>`;
    return createIcon(html, 32);
};

const createGenericIcon = (iconNode: React.ReactNode, bgColor: string, size: number = 28) => {
    const iconMarkup = renderToStaticMarkup(iconNode);
    const html = `
    <div style="background-color: ${bgColor}; width: ${size}px; height: ${size}px; border-radius: ${size / 2}px; display: flex; justify-content: center; align-items: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
        ${iconMarkup}
    </div>`;
    return createIcon(html, size);
};

const createProfileIcon = (photoURL: string, borderColor: string) => {
    const html = `
    <div style="width: 32px; height: 32px; border-radius: 16px; border: 3px solid ${borderColor}; box-shadow: 0 2px 6px rgba(0,0,0,0.3); overflow: hidden; background-color: #eee;">
        <img src="${photoURL}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'"/>
    </div>`;
    return createIcon(html, 32);
};

const getSavedPlaceIconMarkup = (iconName?: string) => {
    switch (iconName) {
        case 'home': return renderToStaticMarkup(<Home size={14} color="#fff" />);
        case 'work': case 'briefcase': return renderToStaticMarkup(<Briefcase size={14} color="#fff" />);
        case 'gym': return renderToStaticMarkup(<Dumbbell size={14} color="#fff" />);
        case 'school': case 'graduation-cap': return renderToStaticMarkup(<GraduationCap size={14} color="#fff" />);
        default: return renderToStaticMarkup(<MapPin size={14} color="#fff" />);
    }
};

const createSavedPlaceIcon = (iconName: string, theme: any) => {
    const iconMarkup = getSavedPlaceIconMarkup(iconName);
    const html = `
    <div style="background-color: ${theme.primary || '#007AFF'}; width: 32px; height: 32px; border-radius: 16px; display: flex; justify-content: center; align-items: center; border: 2px solid #FFD700; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        ${iconMarkup}
    </div>`;
    return createIcon(html, 32);
};


const EMPTY_POINTS: LatLng[] = [];
const EMPTY_SAVED_PLACES: any[] = [];

const MapLeaflet = React.memo(({
    mode = 'view',
    theme,
    height = 300,
    readOnly = false,
    initialPoints = EMPTY_POINTS,
    onPointsChange,
    trip,
    customStopOrder,
    startPoint: propStartPoint,
    endPoint: propEndPoint,
    waypoints: propWaypoints = EMPTY_POINTS,
    driverLocation,
    maxPoints,
    savedPlaces: propSavedPlaces,
    style,
    selectedRouteId,
    onRouteSelect,
    clientColors,
    onMapPress,
    edgePadding,
    boundsPoints
}: MapProps) => {
    const { location } = useLocationStore();
    const { user } = useAuthStore();
    const savedPlaces = propSavedPlaces ?? user?.savedPlaces ?? EMPTY_SAVED_PLACES;

    // State
    const [points, setPoints] = useState<LatLng[]>(initialPoints);
    const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
    const [intermediatePoints, setIntermediatePoints] = useState<RoutePoint[]>([]);
    const [mapCenter, setMapCenter] = useState<LatLng | undefined>(undefined);

    // Derived points for fitting bounds
    const [allPointsToFit, setAllPointsToFit] = useState<LatLng[]>([]);

    // Initialize Picker Points
    useEffect(() => {
        if (mode === 'picker' && initialPoints && initialPoints.length > 0) {
            setPoints(initialPoints);
        }
    }, [initialPoints, mode]);

    // Calculate Trip/Route Data
    useEffect(() => {
        if (mode === 'trip' && trip) {
            const driverRoute = trip.routeId;
            const clients = trip.clients || [];

            if (customStopOrder && customStopOrder.length > 0) {
                const coords = customStopOrder.map(s => ({
                    latitude: s.latitude,
                    longitude: s.longitude
                }));
                setRouteCoordinates(coords);
            } else {
                const { sortedPoints, routeCoordinates: computedRoute } = optimizeRoute(
                    driverRoute?.startPoint,
                    driverRoute?.endPoint,
                    driverRoute?.waypoints,
                    clients
                );
                setIntermediatePoints(sortedPoints);
                setRouteCoordinates(computedRoute);
            }
        } else if (mode === 'route' && propStartPoint && propEndPoint) {
            const coords: LatLng[] = [propStartPoint, ...propWaypoints, propEndPoint];
            setRouteCoordinates(coords);
        }
    }, [mode, trip, customStopOrder, propStartPoint, propEndPoint, propWaypoints]);

    // Calculate Points to Fit - COMPREHENSIVE LOGIC (Matches Map.tsx)
    useEffect(() => {
        let markersToFit: LatLng[] = [];

        // Mode: Picker (includes saved places)
        if (mode === 'picker') {
            if (savedPlaces?.length) {
                const saved = savedPlaces.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
                markersToFit.push(...saved);
            }
            if (points.length) markersToFit.push(...points);
        }

        // Mode: Route
        if (mode === 'route') {
            if (propStartPoint) markersToFit.push(propStartPoint);
            if (propEndPoint) markersToFit.push(propEndPoint);
            if (propWaypoints) markersToFit.push(...propWaypoints);
            // Include polyline points for better fit
            if (routeCoordinates.length > 0) markersToFit.push(...routeCoordinates);
        }

        // Mode: Trip
        if (mode === 'trip' && trip) {
            // If explicit boundsPoints provided, use those instead
            if (boundsPoints && boundsPoints.length > 0) {
                markersToFit.push(...boundsPoints);
            } else {
                // REMOVED driverLocation from fitting logic to prevent constant re-zooming

                // Trip Points (using helper or direct properties)
                const tripPoints = getAllPointsFromTrip(trip);
                markersToFit.push(...tripPoints);

                // Include polyline points
                if (routeCoordinates.length > 0) markersToFit.push(...routeCoordinates);
            }
        }

        // Filter invalid points strictly
        // @ts-ignore
        markersToFit = markersToFit.filter(p =>
            p &&
            typeof p.latitude === 'number' && !isNaN(p.latitude) &&
            typeof p.longitude === 'number' && !isNaN(p.longitude)
        );

        // Only update if we have points
        if (markersToFit.length > 0) {
            setAllPointsToFit(markersToFit);
        }

    }, [points, trip, mode, propStartPoint, propEndPoint, propWaypoints, savedPlaces, routeCoordinates, boundsPoints]);
    // NOTE: Removed driverLocation from dependencies

    // Handlers
    const handleMapClick = (e: L.LeafletMouseEvent) => {
        onMapPress?.();
        if (mode !== 'picker' || readOnly) return;
        const newPoint = { latitude: e.latlng.lat, longitude: e.latlng.lng };

        let newPoints = [...points];
        if (maxPoints === 1) {
            newPoints = [newPoint];
        } else if (maxPoints && points.length >= maxPoints) {
            return;
        } else {
            newPoints.push(newPoint);
        }

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
        }
    };

    // Default center (Casablanca)
    const defaultCenter: [number, number] = [33.5731, -7.5898];

    return (
        <View style={[styles.container, style]}>
            <LeafletStyles />
            <div style={{ height: (typeof height === 'number' ? `${height}px` : (height as string || '300px')), width: '100%', borderRadius: 20, overflow: 'hidden', zIndex: 1, position: 'relative' }}>
                <MapContainer
                    center={defaultCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; Detour.ma'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapBoundsUpdater points={allPointsToFit} edgePadding={edgePadding} />
                    <MapEvents onMapClick={handleMapClick} />
                    <MapCenterUpdater center={mapCenter} />

                    {/* --- Saved Places (shown in ALL modes) --- */}
                    {savedPlaces?.filter(p => p && typeof p.latitude === 'number' && !isNaN(p.latitude) && typeof p.longitude === 'number' && !isNaN(p.longitude)).map((place: any, index: number) => (
                        <Marker
                            key={`saved-${index}`}
                            position={[place.latitude, place.longitude]}
                            icon={createSavedPlaceIcon(place.icon, theme)}
                            eventHandlers={{
                                click: () => {
                                    if (mode !== 'picker' || readOnly) return;
                                    const newPoint = { latitude: place.latitude, longitude: place.longitude };
                                    setPoints([...points, newPoint]);
                                    onPointsChange && onPointsChange([...points, newPoint]);
                                }
                            }}
                        >
                            <Popup>
                                <div style={{ minWidth: '140px' }}>
                                    <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>
                                        {place.label}
                                    </div>
                                    {place.address && (
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                            {place.address}
                                        </div>
                                    )}
                                    {mode === 'picker' && !readOnly && (
                                        <div style={{ fontSize: '10px', color: theme.primary || '#007AFF' }}>
                                            Click to add to route
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* --- Picker Mode Markers --- */}
                    {mode === 'picker' && (
                        <>
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
                        </>
                    )}

                    {/* --- Trip Markers using intermediatePoints (same as TripMapLeaflet logic) --- */}
                    {mode === 'trip' && trip && (() => {
                        // Get first client's routeId for click-to-select on driver route elements
                        const firstClient = trip.clients?.[0];
                        // @ts-ignore
                        const firstClientRouteId = (firstClient?.routeId as any)?._id || firstClient?.routeId?.id;
                        const handleDriverRouteClick = () => {
                            if (firstClientRouteId && onRouteSelect) onRouteSelect(firstClientRouteId);
                        };
                        return (
                            <>
                                {/* Driver Start */}
                                {trip.routeId?.startPoint?.latitude !== undefined && trip.routeId?.startPoint?.longitude !== undefined && (
                                    <Marker
                                        position={[trip.routeId.startPoint.latitude, trip.routeId.startPoint.longitude]}
                                        icon={createGenericIcon(<Car size={14} color="#fff" />, '#10b981')}
                                        eventHandlers={{ click: handleDriverRouteClick }}
                                    />
                                )}
                                {/* Driver End */}
                                {trip.routeId?.endPoint?.latitude !== undefined && trip.routeId?.endPoint?.longitude !== undefined && (
                                    <Marker
                                        position={[trip.routeId.endPoint.latitude, trip.routeId.endPoint.longitude]}
                                        icon={createGenericIcon(<MapPin size={14} color="#fff" />, '#ef4444')}
                                        eventHandlers={{ click: handleDriverRouteClick }}
                                    />
                                )}

                                {/* Waypoints */}
                                {intermediatePoints.filter(p => p.type === 'waypoint').map((wp, i) => (
                                    <Marker
                                        key={`wp-${i}`}
                                        position={[wp.lat, wp.lon]}
                                        icon={createGenericIcon(<Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>{i + 1}</Text>, theme.primary || '#007AFF', 22)}
                                        eventHandlers={{ click: handleDriverRouteClick }}
                                    />
                                ))}

                                {/* Clients */}
                                {intermediatePoints.filter(p => p.type === 'pickup' || p.type === 'dropoff').map((p, i) => {
                                    // Find client info
                                    const client = trip.clients?.[p.clientIndex || 0];
                                    const isPickup = p.type === 'pickup';
                                    // @ts-ignore
                                    const routeId = (client?.routeId as any)?._id || client?.routeId?.id;
                                    const isSelected = selectedRouteId === routeId;
                                    const baseColor = isPickup ? '#10b981' : '#ef4444';
                                    const color = clientColors?.[routeId] || baseColor;
                                    const Icon = isPickup ? User : MapPin;
                                    const showFullMarker = isSelected;

                                    if (!showFullMarker) {
                                        return (
                                            <Marker
                                                key={`${p.type}-${p.clientIndex}`}
                                                position={[p.lat, p.lon]}
                                                icon={createDotIcon(color)}
                                                eventHandlers={{
                                                    click: () => onRouteSelect?.(routeId)
                                                }}
                                            />
                                        );
                                    }

                                    return (
                                        <Marker
                                            key={`${p.type}-${p.clientIndex}`}
                                            position={[p.lat, p.lon]}
                                            icon={client?.userId?.photoURL
                                                ? createProfileIcon(client.userId.photoURL, baseColor)
                                                : createGenericIcon(<Icon size={12} color="#fff" />, color, 24)
                                            }
                                            zIndexOffset={100}
                                            eventHandlers={{
                                                click: () => onRouteSelect?.(routeId)
                                            }}
                                        >
                                            <Popup>
                                                <div style={{ minWidth: '120px' }}>
                                                    <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>
                                                        {isPickup ? 'Pickup: ' : 'Dropoff: '}{client?.userId?.fullName || 'Client'}
                                                    </div>
                                                    {client?.userId?.email && (
                                                        <div style={{ fontSize: '12px', color: '#666' }}>{client.userId.email}</div>
                                                    )}
                                                    {client?.price && (
                                                        <div style={{ fontSize: '12px', fontWeight: '700', color: theme.primary || '#007AFF', marginTop: '4px' }}>
                                                            {client.price} MAD
                                                        </div>
                                                    )}
                                                    {client?.seats && (
                                                        <div style={{ fontSize: '12px' }}>{client.seats} seat(s)</div>
                                                    )}
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </>
                        );
                    })()}

                    {/* --- Route Markers --- */}
                    {mode === 'route' && (
                        <>
                            {propStartPoint?.latitude !== undefined && propStartPoint?.longitude !== undefined && (
                                <Marker
                                    position={[propStartPoint.latitude, propStartPoint.longitude]}
                                    icon={createGenericIcon(<Navigation size={14} color="#fff" />, '#10b981')}
                                />
                            )}
                            {propWaypoints.filter(wp => wp.latitude !== undefined && wp.longitude !== undefined).map((wp, i) => (
                                <Marker
                                    key={i}
                                    position={[wp.latitude, wp.longitude]}
                                    icon={createGenericIcon(<Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>{i + 1}</Text>, '#f59e0b', 24)}
                                />
                            ))}
                            {propEndPoint?.latitude !== undefined && propEndPoint?.longitude !== undefined && (
                                <Marker
                                    position={[propEndPoint.latitude, propEndPoint.longitude]}
                                    icon={createGenericIcon(<MapPin size={14} color="#fff" />, '#ef4444')}
                                />
                            )}
                        </>
                    )}


                    {/* Driver Location */}
                    {driverLocation && (
                        <Marker
                            position={[driverLocation.latitude, driverLocation.longitude]}
                            icon={createCarIcon(driverLocation.heading, theme)}
                        />
                    )}

                    {/* Polylines */}
                    {(mode === 'picker' && points.length > 1) && (
                        <Polyline
                            positions={points.map(p => [p.latitude, p.longitude])}
                            pathOptions={{ color: theme.primary || '#007AFF', weight: 4, opacity: 0.8 }}
                        />
                    )}
                    {((mode === 'trip' || mode === 'route') && routeCoordinates.length > 1) && (
                        <Polyline
                            positions={routeCoordinates.map(p => [p.latitude, p.longitude])}
                            pathOptions={{ color: theme.primary || '#007AFF', weight: 4, opacity: 0.8 }}
                            eventHandlers={{
                                click: () => {
                                    if (mode === 'trip' && trip?.clients?.length && onRouteSelect) {
                                        const firstClient = trip.clients[0];
                                        // @ts-ignore
                                        const routeId = (firstClient?.routeId as any)?._id || firstClient?.routeId?.id;
                                        if (routeId) onRouteSelect(routeId);
                                    }
                                }
                            }}
                        />
                    )}

                    {/* Client Route Polylines */}
                    {mode === 'trip' && trip?.clients?.map((client: any, index: number) => {
                        const clientGeom = client.routeId?.routeGeometry;
                        if (!clientGeom) return null;

                        // @ts-ignore
                        const routeId = (client.routeId as any)?._id || client.routeId?.id;
                        const isSelected = selectedRouteId === routeId;
                        const color = clientColors?.[routeId] || theme.secondary || '#6366f1';
                        // @ts-ignore
                        const clientCoords = decodePolyline(clientGeom);

                        const weight = isSelected ? 5 : 4;
                        const dashArray = isSelected ? undefined : '10, 5';

                        return (
                            <Polyline
                                key={`client-route-${index}`}
                                positions={clientCoords.map((p: any) => [p.latitude, p.longitude])}
                                pathOptions={{ color, weight, opacity: 0.8, dashArray }}
                                eventHandlers={{
                                    click: () => onRouteSelect?.(routeId)
                                }}
                            />
                        );
                    })}



                </MapContainer>
            </div>

            {/* Picker Controls */}
            {mode === 'picker' && !readOnly && (
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
            )}
        </View>
    );
});

export default MapLeaflet;

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
        position: 'relative',
        backgroundColor: '#e5e3df',
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
        cursor: 'pointer',
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
