import { Briefcase, Check, Dumbbell, GraduationCap, Home, MapPin, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../constants/theme';
import { RouteService } from '../services/RouteService';
import { useAuthStore } from '../store/useAuthStore';
import { usePlacesStore } from '../store/usePlacesStore';
import { LatLng } from '../store/useTripStore';
import { useUIStore } from '../store/useUIStore';
import DetourMap from './Map';

export default function PlacesManager() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { places, addPlace, removePlace, fetchPlaces, isLoading } = usePlacesStore();
    const { showToast, showConfirm } = useUIStore();

    const [isAdding, setIsAdding] = useState(false);
    const [label, setLabel] = useState('');
    const [address, setAddress] = useState('');
    const [coordinate, setCoordinate] = useState<LatLng | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [viewCoordinate, setViewCoordinate] = useState<LatLng | null>(null);

    useEffect(() => {
        fetchPlaces();
    }, []);

    // Set initial view coordinate to first place if available
    useEffect(() => {
        if (places.length > 0 && !viewCoordinate) {
            setViewCoordinate({
                latitude: places[0].latitude,
                longitude: places[0].longitude,
                address: places[0].address
            });
        }
    }, [places]);

    const handleAddPlace = () => {
        setLabel('');
        setAddress('');
        setCoordinate(null);
        setIsAdding(true);
    };

    const handleSavePlace = async () => {
        if (!label || !address || !coordinate) {
            showToast('Please fill all fields and select a location', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            let iconName = 'map-pin';
            const lowerLabel = label.toLowerCase();
            if (lowerLabel === 'home') iconName = 'home';
            else if (lowerLabel === 'work') iconName = 'briefcase';
            else if (lowerLabel === 'gym') iconName = 'gym';
            else if (lowerLabel === 'school') iconName = 'graduation-cap';

            await addPlace({
                label,
                address,
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                icon: iconName
            });
            showToast('Place saved successfully', 'success');
            setIsAdding(false);
        } catch (error) {
            showToast('Failed to save place', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePlace = (id: string, name: string) => {
        showConfirm({
            title: "Delete Place",
            message: `Are you sure you want to delete "${name}"?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: async () => {
                try {
                    await removePlace(id);
                    showToast('Place removed', 'success');
                } catch (error) {
                    showToast('Failed to remove place', 'error');
                }
            }
        });
    };

    const handleMapPointsChange = async (points: LatLng[]) => {
        if (points.length > 0) {
            const point = points[0]; // Only take single point for place
            setCoordinate(point);
            try {
                // Auto-fill address
                const addr = await RouteService.reverseGeocode(point.latitude, point.longitude);
                setAddress(addr);
            } catch (error) {
                console.log('Failed to reverse geocode', error);
            }
        } else {
            setCoordinate(null);
            setAddress('');
        }
    };

    const handlePlaceClick = (place: any) => {
        setViewCoordinate({
            latitude: place.latitude,
            longitude: place.longitude,
            address: place.address
        });
    };

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'home': return <Home size={24} color={theme.primary} />;
            case 'briefcase': return <Briefcase size={24} color={theme.primary} />;
            case 'gym': return <Dumbbell size={24} color={theme.primary} />;
            case 'school':
            case 'graduation-cap': return <GraduationCap size={24} color={theme.primary} />;
            default: return <MapPin size={24} color={theme.primary} />;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Saved Places</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={handleAddPlace}
                >
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Main Map View */}
            <View style={[styles.mapPreview, { borderColor: theme.border }]}>
                {/* Re-render map when viewCoordinate changes to force update center if needed, though props should handle it */}
                <DetourMap
                    key={viewCoordinate ? `${viewCoordinate.latitude}-${viewCoordinate.longitude}` : `map-${places.length}`}
                    mode="picker"
                    theme={theme}
                    height={200}
                    initialPoints={viewCoordinate ? [viewCoordinate] : []}
                    savedPlaces={places}
                    maxPoints={1}
                    readOnly={true}
                />
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {isLoading ? (
                    <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
                ) : places && places.length > 0 ? (
                    places.map((place) => (
                        <TouchableOpacity
                            key={place._id}
                            style={[
                                styles.placeItem,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: (viewCoordinate?.latitude === place.latitude && viewCoordinate?.longitude === place.longitude) ? theme.primary : theme.border
                                }
                            ]}
                            onPress={() => handlePlaceClick(place)}
                        >
                            <View style={[styles.iconBox, { backgroundColor: theme.primary + '15' }]}>
                                {getIcon(place.icon)}
                            </View>
                            <View style={styles.placeInfo}>
                                <Text style={[styles.placeLabel, { color: theme.text }]}>{place.label}</Text>
                                <Text style={[styles.placeAddress, { color: theme.icon }]} numberOfLines={1}>{place.address}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.deleteButton, { backgroundColor: theme.border }]}
                                onPress={() => handleDeletePlace(place._id, place.label)}
                            >
                                <Trash2 size={18} color={theme.text} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <MapPin size={48} color={theme.icon} style={{ opacity: 0.5 }} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>No saved places yet.</Text>
                        <Text style={[styles.emptySubtext, { color: theme.icon }]}>Add Home, Work, or favorite spots for quick access.</Text>
                    </View>
                )}
            </ScrollView>

            {/* Add Place Modal */}
            <Modal
                visible={isAdding}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsAdding(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Place</Text>
                        <TouchableOpacity onPress={() => setIsAdding(false)} style={styles.closeButton}>
                            <X size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <View style={styles.formGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Label</Text>
                            <View style={styles.labelPresets}>
                                {[
                                    { label: 'Home', icon: Home },
                                    { label: 'Work', icon: Briefcase },
                                    { label: 'Gym', icon: Dumbbell },
                                    { label: 'School', icon: GraduationCap }
                                ].map(({ label: presetLabel, icon: Icon }) => (
                                    <TouchableOpacity
                                        key={presetLabel}
                                        style={[
                                            styles.presetChip,
                                            {
                                                backgroundColor: label === presetLabel ? theme.primary : theme.surface,
                                                borderColor: theme.border,
                                                gap: 8,
                                                flexDirection: 'row',
                                                alignItems: 'center'
                                            }
                                        ]}
                                        onPress={() => setLabel(presetLabel)}
                                    >
                                        <Icon size={16} color={label === presetLabel ? '#fff' : theme.text} />
                                        <Text style={{ color: label === presetLabel ? '#fff' : theme.text, fontWeight: '600' }}>{presetLabel}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                placeholder="Custom Label (e.g. Grandma's House)"
                                placeholderTextColor={theme.icon}
                                value={label}
                                onChangeText={setLabel}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Location</Text>
                            <Text style={[styles.subLabel, { color: theme.icon }]}>Tap on map to select</Text>
                            <View style={[styles.mapContainer, { borderColor: theme.border }]}>
                                <DetourMap
                                    mode="picker"
                                    onPointsChange={handleMapPointsChange}
                                    theme={theme}
                                    height={300}
                                    initialPoints={coordinate ? [coordinate] : []}
                                    maxPoints={1}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Address</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                placeholder="Address"
                                placeholderTextColor={theme.icon}
                                value={address}
                                onChangeText={setAddress}
                                editable={false} // Address comes from map usually, but can create editable if needed
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.primary, opacity: (!label || !coordinate) ? 0.5 : 1 }]}
                            onPress={handleSavePlace}
                            disabled={!label || !coordinate || isSaving}
                        >
                            {isSaving ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Check size={20} color="#fff" />
                                    <Text style={styles.saveButtonText}>Save Place</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 0, // Removed top padding as Safe Area should handle it or parent
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        marginBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    listContent: {
        paddingHorizontal: 24,
        gap: 16,
        paddingBottom: 40,
        paddingTop: 10
    },
    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    placeInfo: {
        flex: 1,
    },
    placeLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    placeAddress: {
        fontSize: 14,
        fontWeight: '500',
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptySubtext: {
        textAlign: 'center',
        maxWidth: 250,
        fontSize: 14,
    },
    mapPreview: {
        height: 200,
        marginHorizontal: 24,
        marginBottom: 10,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 8,
    },
    modalContent: {
        padding: 24,
        gap: 24,
    },
    formGroup: {
        gap: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
    },
    subLabel: {
        fontSize: 13,
        marginTop: -6,
    },
    labelPresets: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    presetChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    input: {
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    mapContainer: {
        height: 300,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    saveButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    }
});
