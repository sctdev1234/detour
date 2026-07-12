import { useUIStore } from '@/store/useUIStore';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
    Calendar,
    Camera,
    Car as CarIcon,
    Palette,
    Plus,
    Upload,
    Users,
    X,
    Check,
    ChevronRight,
    ChevronLeft,
    FileText,
    Shield,
    Wrench,
    AlertCircle,
    CheckCircle2
} from 'lucide-react-native';
import React, { useState, useRef, useEffect } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Dimensions
} from 'react-native';
import { Colors } from '../../constants/theme';
import { useAddCar, useCars } from '../../hooks/api/useCarQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { uploadImage } from '../../services/storageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VEHICLE_BRANDS: Record<string, string[]> = {
    'Dacia': ['Sandero', 'Logan', 'Duster', 'Lodgy', 'Dokker'],
    'Renault': ['Clio', 'Megane', 'Captur', 'Express', 'Kadjar', 'Twingo'],
    'Peugeot': ['208', '308', '2008', '3008', 'Partner', 'Rifter', '508'],
    'Volkswagen': ['Golf', 'Polo', 'Tiguan', 'Touareg', 'Caddy', 'Passat', 'Touran'],
    'Hyundai': ['i10', 'i20', 'i30', 'Tucson', 'Santa Fe', 'Creta', 'Elantra'],
    'Toyota': ['Yaris', 'Corolla', 'Rav4', 'Prado', 'Hilux', 'C-HR', 'Land Cruiser'],
    'Mercedes-Benz': ['Class A', 'Class C', 'Class E', 'GLA', 'GLC', 'GLE', 'CLA'],
    'BMW': ['Series 1', 'Series 3', 'Series 5', 'X1', 'X3', 'X5', 'Series 4'],
    'Audi': ['A1', 'A3', 'A4', 'Q2', 'Q3', 'Q5', 'A6', 'Q7'],
    'Fiat': ['Panda', '500', 'Doblo', 'Tipo', 'Fiorino'],
    'Kia': ['Picanto', 'Rio', 'Sportage', 'Sorento', 'Ceed'],
    'Ford': ['Fiesta', 'Focus', 'Kuga', 'Ranger', 'Fusion']
};

const FUEL_TYPES = ['Diesel', 'Petrol', 'Hybrid', 'Electric'];
const TRANSMISSION_TYPES = ['Manual', 'Automatic'];

const COLOR_PRESETS = [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#000000' },
    { name: 'Grey', hex: '#8E8E93' },
    { name: 'Silver', hex: '#E5E5EA' },
    { name: 'Red', hex: '#FF3B30' },
    { name: 'Blue', hex: '#007AFF' },
    { name: 'Brown', hex: '#A2845E' },
    { name: 'Green', hex: '#34C759' }
];

const YEARS = Array.from({ length: 22 }, (_, i) => String(2026 - i));

type Step = 1 | 2 | 3 | 4 | 5; // 1: basics, 2: technical, 3: photos, 4: review, 5: success

export default function AddCarScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const user = useAuthStore((state) => state.user);
    const { data: cars = [] } = useCars();
    const { mutateAsync: addCar, isPending: isAdding } = useAddCar();
    const { showToast } = useUIStore();

    const isFirstCar = cars.length === 0;

    // Form State
    const [step, setStep] = useState<Step>(1);
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('2022');
    const [color, setColor] = useState('White');
    const [seats, setSeats] = useState(4);
    const [fuel, setFuel] = useState('Diesel');
    const [transmission, setTransmission] = useState('Manual');
    const [isDefault, setIsDefault] = useState(false);

    // Plate segments
    const [plateNum, setPlateNum] = useState('');
    const [plateLetter, setPlateLetter] = useState('');
    const [plateCity, setPlateCity] = useState('');

    // Photo Slots
    const [photos, setPhotos] = useState<{
        front: string;
        rear: string;
        side: string;
        interior: string;
    }>({ front: '', rear: '', side: '', interior: '' });

    // Document Slots
    const [documents, setDocuments] = useState<{
        registration: string;
        insurance: string;
        technicalVisit: string;
    }>({ registration: '', insurance: '', technicalVisit: '' });

    // Autocomplete / UI control states
    const [brandSearch, setBrandSearch] = useState('');
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showYearDropdown, setShowYearDropdown] = useState(false);

    // Upload & submission state
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);

    // Force default if first car
    useEffect(() => {
        if (isFirstCar) {
            setIsDefault(true);
        }
    }, [isFirstCar]);

    const filteredBrands = Object.keys(VEHICLE_BRANDS).filter(b =>
        b.toLowerCase().includes(brandSearch.toLowerCase())
    );

    const availableModels = brand ? VEHICLE_BRANDS[brand] || [] : [];

    const handleSelectBrand = (selected: string) => {
        setBrand(selected);
        setBrandSearch(selected);
        setModel(''); // reset model
        setShowBrandDropdown(false);
    };

    const handleSelectModel = (selected: string) => {
        setModel(selected);
        setShowModelDropdown(false);
    };

    // Moroccan Plate Formatting
    const handlePlateLetterChange = (text: string) => {
        // Arabic / Latin check
        const clean = text.replace(/[^A-Za-z\u0600-\u06FF]/g, '').toUpperCase();
        setPlateLetter(clean);
    };

    const pickImageSlot = async (slot: 'front' | 'rear' | 'side' | 'interior' | 'registration' | 'insurance' | 'technicalVisit', useCamera = false) => {
        let result;
        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
        };

        if (useCamera) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                showToast('Camera permission is required', 'warning');
                return;
            }
            result = await ImagePicker.launchCameraAsync(options);
        } else {
            result = await ImagePicker.launchImageLibraryAsync(options);
        }

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            
            // Resolution check
            if (asset.width < 600 || asset.height < 600) {
                showToast('Image resolution is too low. Minimum 600x600px required.', 'warning');
                return;
            }

            if (slot === 'front' || slot === 'rear' || slot === 'side' || slot === 'interior') {
                setPhotos(prev => ({ ...prev, [slot]: asset.uri }));
            } else {
                setDocuments(prev => ({ ...prev, [slot]: asset.uri }));
            }
        }
    };

    const removeImageSlot = (slot: 'front' | 'rear' | 'side' | 'interior' | 'registration' | 'insurance' | 'technicalVisit') => {
        if (slot === 'front' || slot === 'rear' || slot === 'side' || slot === 'interior') {
            setPhotos(prev => ({ ...prev, [slot]: '' }));
        } else {
            setDocuments(prev => ({ ...prev, [slot]: '' }));
        }
    };

    // Validation per step
    const validateStep = () => {
        if (step === 1) {
            if (!brand) {
                showToast('Please select a vehicle brand', 'warning');
                return false;
            }
            if (!model) {
                showToast('Please select a vehicle model', 'warning');
                return false;
            }
            if (!year) {
                showToast('Please select the vehicle year', 'warning');
                return false;
            }
        } else if (step === 2) {
            if (!color) {
                showToast('Please select a color', 'warning');
                return false;
            }
            if (!plateNum || !plateLetter || !plateCity) {
                showToast('Please complete the Moroccan license plate segments', 'warning');
                return false;
            }
            if (plateNum.length < 1 || plateCity.length < 1) {
                showToast('License plate segments are incomplete', 'warning');
                return false;
            }
        } else if (step === 3) {
            if (!photos.front || !photos.rear || !photos.side) {
                showToast('Front, Rear, and Side photos are required', 'warning');
                return false;
            }
            if (!documents.registration || !documents.insurance) {
                showToast('Car Registration and Insurance documents are required', 'warning');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep(prev => (prev + 1) as Step);
        }
    };

    const handleBack = () => {
        setStep(prev => (prev - 1) as Step);
    };

    const handleCancelUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setUploading(false);
        setUploadProgress(0);
        showToast('Registration upload cancelled', 'info');
    };

    const handleSave = async () => {
        if (!user?.id) {
            showToast('User session is invalid', 'error');
            return;
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setUploading(true);
        setUploadProgress(0);

        try {
            // Gather all selected assets
            const uploadJobs = [
                { uri: photos.front, folder: 'cars', type: 'front' },
                { uri: photos.rear, folder: 'cars', type: 'rear' },
                { uri: photos.side, folder: 'cars', type: 'side' },
                ...(photos.interior ? [{ uri: photos.interior, folder: 'cars', type: 'interior' }] : []),
                { uri: documents.registration, folder: 'car-documents', type: 'registration' },
                { uri: documents.insurance, folder: 'car-documents', type: 'insurance' },
                ...(documents.technicalVisit ? [{ uri: documents.technicalVisit, folder: 'car-documents', type: 'technicalVisit' }] : [])
            ];

            const totalFiles = uploadJobs.length;
            const uploadedUrls: Record<string, string> = {};

            for (let i = 0; i < totalFiles; i++) {
                const job = uploadJobs[i];
                setUploadStatusText(`Uploading ${job.type} (${i + 1}/${totalFiles})...`);
                
                const url = await uploadImage(job.uri, job.folder, signal);
                uploadedUrls[job.type] = url;

                setUploadProgress(((i + 1) / totalFiles) * 100);
            }

            // Construct serialized plate & metadata string for the database model
            const fullPlate = `${plateNum}-${plateLetter}-${plateCity}`;
            const serializedModel = `${model} | ${fullPlate} | ${fuel} | ${transmission}`;

            setUploadStatusText('Creating vehicle record...');
            
            await addCar({
                marque: brand,
                model: serializedModel,
                year,
                color,
                places: seats,
                isDefault,
                images: [uploadedUrls.front, uploadedUrls.rear, uploadedUrls.side, uploadedUrls.interior].filter(Boolean) as string[],
                documents: {
                    registration: uploadedUrls.registration,
                    insurance: uploadedUrls.insurance,
                    technicalVisit: uploadedUrls.technicalVisit
                }
            });

            // Transition to Success Step
            setUploading(false);
            setStep(5);
        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error(error);
            showToast('Registration failed: ' + (error.message || 'Server error'), 'error');
            setUploading(false);
        }
    };

    // Render methods
    const renderProgressBar = () => {
        const progress = ((step - 1) / 3) * 100;
        return (
            <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.primary }]} />
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                {step > 1 && step < 5 && (
                    <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { borderColor: theme.border }]}>
                        <ChevronLeft size={20} color={theme.text} />
                    </TouchableOpacity>
                )}
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {step === 5 ? 'Success' : `Register Vehicle (${step}/4)`}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {step < 5 && renderProgressBar()}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    
                    {/* STEP 1: BASICS */}
                    {step === 1 && (
                        <View style={styles.stepContainer}>
                            <Text style={[styles.stepTitle, { color: theme.text }]}>Vehicle Details</Text>
                            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>Enter the base manufacturer specifications of your vehicle.</Text>

                            {/* Brand Selector */}
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.label, { color: theme.text }]}>Brand / Marque</Text>
                                <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowBrandDropdown(!showBrandDropdown)}>
                                    <Text style={{ color: brand ? theme.text : (isDark ? '#636366' : '#9CA3AF'), fontSize: 16 }}>{brand || 'Select Brand'}</Text>
                                    <ChevronRight size={18} color={theme.icon} style={{ transform: [{ rotate: showBrandDropdown ? '90deg' : '0deg' }] }} />
                                </TouchableOpacity>
                                {showBrandDropdown && (
                                    <View style={[styles.dropdownList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                        <TextInput
                                            style={[styles.dropdownSearch, { color: theme.text, borderColor: theme.border }]}
                                            placeholder="Search brand..."
                                            placeholderTextColor={isDark ? '#636366' : '#9CA3AF'}
                                            value={brandSearch}
                                            onChangeText={setBrandSearch}
                                        />
                                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                            {filteredBrands.map(b => (
                                                <TouchableOpacity key={b} style={styles.dropdownItem} onPress={() => handleSelectBrand(b)}>
                                                    <Text style={{ color: theme.text, fontSize: 15 }}>{b}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Model Selector */}
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.label, { color: theme.text }]}>Model</Text>
                                <TouchableOpacity
                                    style={[styles.pickerBtn, { backgroundColor: theme.surface, borderColor: theme.border }, !brand && { opacity: 0.5 }]}
                                    onPress={() => brand && setShowModelDropdown(!showModelDropdown)}
                                    disabled={!brand}
                                >
                                    <Text style={{ color: model ? theme.text : (isDark ? '#636366' : '#9CA3AF'), fontSize: 16 }}>{model || 'Select Model'}</Text>
                                    <ChevronRight size={18} color={theme.icon} style={{ transform: [{ rotate: showModelDropdown ? '90deg' : '0deg' }] }} />
                                </TouchableOpacity>
                                {showModelDropdown && (
                                    <ScrollView style={[styles.dropdownList, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: 150 }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                        {availableModels.map(m => (
                                            <TouchableOpacity key={m} style={styles.dropdownItem} onPress={() => handleSelectModel(m)}>
                                                <Text style={{ color: theme.text, fontSize: 15 }}>{m}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>

                            {/* Year Dropdown */}
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.label, { color: theme.text }]}>Year of Fabrication</Text>
                                <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowYearDropdown(!showYearDropdown)}>
                                    <Text style={{ color: theme.text, fontSize: 16 }}>{year}</Text>
                                    <ChevronRight size={18} color={theme.icon} style={{ transform: [{ rotate: showYearDropdown ? '90deg' : '0deg' }] }} />
                                </TouchableOpacity>
                                {showYearDropdown && (
                                    <ScrollView style={[styles.dropdownList, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: 150 }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                        {YEARS.map(y => (
                                            <TouchableOpacity key={y} style={styles.dropdownItem} onPress={() => { setYear(y); setShowYearDropdown(false); }}>
                                                <Text style={{ color: theme.text, fontSize: 15 }}>{y}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        </View>
                    )}

                    {/* STEP 2: TECHNICAL DETAILS */}
                    {step === 2 && (
                        <View style={styles.stepContainer}>
                            <Text style={[styles.stepTitle, { color: theme.text }]}>Vehicle Configuration</Text>
                            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>Provide specific characteristics and license plate information.</Text>

                            {/* Color Selection */}
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.label, { color: theme.text, marginBottom: 10 }]}>Exterior Color</Text>
                                <View style={styles.colorGrid}>
                                    {COLOR_PRESETS.map(c => (
                                        <TouchableOpacity
                                            key={c.name}
                                            style={[
                                                styles.colorChip,
                                                { backgroundColor: theme.surface, borderColor: color === c.name ? theme.primary : theme.border }
                                            ]}
                                            onPress={() => setColor(c.name)}
                                        >
                                            <View style={[styles.colorDot, { backgroundColor: c.hex, borderWidth: c.name === 'White' ? 1 : 0, borderColor: '#CCC' }]} />
                                            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{c.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Seats Stepper */}
                            <View style={[styles.rowContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <View>
                                    <Text style={[styles.rowLabel, { color: theme.text }]}>Passenger Seats</Text>
                                    <Text style={[styles.rowSub, { color: theme.textSecondary }]}>Excluding driver's seat</Text>
                                </View>
                                <View style={styles.stepperContainer}>
                                    <TouchableOpacity style={[styles.stepperBtn, { backgroundColor: theme.border }]} onPress={() => setSeats(prev => Math.max(2, prev - 1))}>
                                        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.stepperValue, { color: theme.text }]}>{seats}</Text>
                                    <TouchableOpacity style={[styles.stepperBtn, { backgroundColor: theme.border }]} onPress={() => setSeats(prev => Math.min(7, prev + 1))}>
                                        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Fuel cards */}
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.label, { color: theme.text, marginBottom: 8 }]}>Fuel Type</Text>
                                <View style={styles.grid2x2}>
                                    {FUEL_TYPES.map(f => (
                                        <TouchableOpacity
                                            key={f}
                                            style={[styles.cardSelect, { backgroundColor: theme.surface, borderColor: fuel === f ? theme.primary : theme.border }]}
                                            onPress={() => setFuel(f)}
                                        >
                                            <Text style={[styles.cardSelectText, { color: theme.text }]}>{f}</Text>
                                            {fuel === f && <Check size={16} color={theme.primary} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Transmission cards */}
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.label, { color: theme.text, marginBottom: 8 }]}>Transmission</Text>
                                <View style={styles.grid2x2}>
                                    {TRANSMISSION_TYPES.map(tOption => (
                                        <TouchableOpacity
                                            key={tOption}
                                            style={[styles.cardSelect, { backgroundColor: theme.surface, borderColor: transmission === tOption ? theme.primary : theme.border }]}
                                            onPress={() => setTransmission(tOption)}
                                        >
                                            <Text style={[styles.cardSelectText, { color: theme.text }]}>{tOption}</Text>
                                            {transmission === tOption && <Check size={16} color={theme.primary} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Moroccan license plate visual input */}
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.label, { color: theme.text }]}>License Plate (Morocco)</Text>
                                <View style={[styles.plateBorderContainer, { borderColor: theme.border }]}>
                                    <View style={styles.plateLeftSection}>
                                        <TextInput
                                            style={[styles.plateInput, { color: theme.text }]}
                                            placeholder="12345"
                                            placeholderTextColor={isDark ? '#555' : '#CCC'}
                                            value={plateNum}
                                            onChangeText={(text) => setPlateNum(text.replace(/[^0-9]/g, ''))}
                                            keyboardType="numeric"
                                            maxLength={5}
                                            textAlign="center"
                                        />
                                    </View>
                                    <View style={[styles.plateDivider, { backgroundColor: theme.border }]} />
                                    <View style={styles.plateMidSection}>
                                        <TextInput
                                            style={[styles.plateInput, { color: theme.text, fontSize: 20 }]}
                                            placeholder="A"
                                            placeholderTextColor={isDark ? '#555' : '#CCC'}
                                            value={plateLetter}
                                            onChangeText={handlePlateLetterChange}
                                            maxLength={2}
                                            textAlign="center"
                                        />
                                    </View>
                                    <View style={[styles.plateDivider, { backgroundColor: theme.border }]} />
                                    <View style={styles.plateRightSection}>
                                        <TextInput
                                            style={[styles.plateInput, { color: theme.text }]}
                                            placeholder="6"
                                            placeholderTextColor={isDark ? '#555' : '#CCC'}
                                            value={plateCity}
                                            onChangeText={(text) => setPlateCity(text.replace(/[^0-9]/g, ''))}
                                            keyboardType="numeric"
                                            maxLength={2}
                                            textAlign="center"
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* STEP 3: VEHICLE PHOTOS & DOCUMENTS */}
                    {step === 3 && (
                        <View style={styles.stepContainer}>
                            <Text style={[styles.stepTitle, { color: theme.text }]}>Photos & Documents</Text>
                            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>Required files for automated verification. Minimum size 600x600px.</Text>

                            {/* Photo Slots */}
                            <Text style={[styles.sectionHeading, { color: theme.text }]}>Car Photos</Text>

                            {[
                                { key: 'front', label: 'Front Angle (Required)' },
                                { key: 'rear', label: 'Rear Angle (Required)' },
                                { key: 'side', label: 'Side Profile (Required)' },
                                { key: 'interior', label: 'Interior Cabin (Optional)' }
                            ].map((slot) => {
                                const uri = photos[slot.key as keyof typeof photos];
                                return (
                                    <View key={slot.key} style={[styles.slotRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                        {uri ? (
                                            <View style={styles.slotImageContainer}>
                                                <Image source={{ uri }} style={styles.slotThumbnail} contentFit="cover" />
                                                <TouchableOpacity style={styles.slotDeleteBtn} onPress={() => removeImageSlot(slot.key as any)}>
                                                    <X size={14} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={[styles.slotPlaceholder, { backgroundColor: theme.background }]}>
                                                <CarIcon size={20} color={theme.icon} />
                                            </View>
                                        )}
                                        <View style={styles.slotInfo}>
                                            <Text style={[styles.slotLabel, { color: theme.text }]}>{slot.label}</Text>
                                            <Text style={[styles.slotSub, { color: theme.textSecondary }]}>
                                                {uri ? 'Selected' : 'Required photo slot'}
                                            </Text>
                                        </View>
                                        {!uri && (
                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                <TouchableOpacity style={[styles.slotPickerBtn, { backgroundColor: theme.primary }]} onPress={() => pickImageSlot(slot.key as any, false)}>
                                                    <Upload size={14} color="#FFF" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.slotPickerBtn, { backgroundColor: theme.primary }]} onPress={() => pickImageSlot(slot.key as any, true)}>
                                                    <Camera size={14} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}

                            {/* Documents Slots */}
                            <Text style={[styles.sectionHeading, { color: theme.text, marginTop: 12 }]}>Required Documents</Text>

                            {[
                                { key: 'registration', label: 'Car Registration (Carte Grise)', icon: FileText },
                                { key: 'insurance', label: 'Insurance Policy', icon: Shield },
                                { key: 'technicalVisit', label: 'Technical Visit Document', icon: Wrench }
                            ].map((slot) => {
                                const uri = documents[slot.key as keyof typeof documents];
                                const Icon = slot.icon;
                                return (
                                    <View key={slot.key} style={[styles.slotRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                        {uri ? (
                                            <View style={styles.slotImageContainer}>
                                                <Image source={{ uri }} style={styles.slotThumbnail} contentFit="cover" />
                                                <TouchableOpacity style={styles.slotDeleteBtn} onPress={() => removeImageSlot(slot.key as any)}>
                                                    <X size={14} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={[styles.slotPlaceholder, { backgroundColor: theme.background }]}>
                                                <Icon size={20} color={theme.icon} />
                                            </View>
                                        )}
                                        <View style={styles.slotInfo}>
                                            <Text style={[styles.slotLabel, { color: theme.text }]}>{slot.label}</Text>
                                            <Text style={[styles.slotSub, { color: theme.textSecondary }]}>
                                                {uri ? 'Uploaded File' : 'Required document copy'}
                                            </Text>
                                        </View>
                                        {!uri && (
                                            <TouchableOpacity style={[styles.slotPickerBtn, { backgroundColor: theme.primary }]} onPress={() => pickImageSlot(slot.key as any, false)}>
                                                <Plus size={14} color="#FFF" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* STEP 4: REVIEW & CONFIRM */}
                    {step === 4 && (
                        <View style={styles.stepContainer}>
                            <Text style={[styles.stepTitle, { color: theme.text }]}>Review Submission</Text>
                            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>Double-check all vehicle parameters before launching GCS upload.</Text>

                            {/* Summary Card */}
                            <View style={[styles.reviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <Text style={[styles.reviewHeader, { color: theme.text }]}>{brand} {model}</Text>
                                <Text style={[styles.reviewSub, { color: theme.textSecondary }]}>Year: {year} • Color: {color}</Text>

                                <View style={[styles.reviewDivider, { backgroundColor: theme.border }]} />

                                <View style={styles.reviewRow}>
                                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Fuel Type</Text>
                                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{fuel}</Text>
                                </View>
                                <View style={styles.reviewRow}>
                                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Transmission</Text>
                                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{transmission}</Text>
                                </View>
                                <View style={styles.reviewRow}>
                                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Passenger Seats</Text>
                                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{seats}</Text>
                                </View>
                                <View style={styles.reviewRow}>
                                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>License Plate</Text>
                                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{`${plateNum} | ${plateLetter} | ${plateCity}`}</Text>
                                </View>
                            </View>

                            {/* Photo Review Strip */}
                            <Text style={[styles.sectionHeading, { color: theme.text }]}>Selected Photos & Documents</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24, paddingLeft: 24, marginVertical: 8 }}>
                                {[
                                    { name: 'Front', uri: photos.front },
                                    { name: 'Rear', uri: photos.rear },
                                    { name: 'Side', uri: photos.side },
                                    ...(photos.interior ? [{ name: 'Interior', uri: photos.interior }] : []),
                                    { name: 'Registration', uri: documents.registration },
                                    { name: 'Insurance', uri: documents.insurance },
                                    ...(documents.technicalVisit ? [{ name: 'Tech Visit', uri: documents.technicalVisit }] : [])
                                ].map((item, idx) => (
                                    <View key={idx} style={[styles.reviewThumbWrapper, { borderColor: theme.border }]}>
                                        <Image source={{ uri: item.uri }} style={styles.reviewThumb} contentFit="cover" />
                                        <View style={styles.reviewThumbLabelBg}>
                                            <Text style={styles.reviewThumbLabel}>{item.name}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>

                            {/* Default Toggle */}
                            {!isFirstCar && (
                                <View style={[styles.switchGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.switchLabel, { color: theme.text }]}>Set as Default Vehicle</Text>
                                        <Text style={[styles.switchSubtitle, { color: theme.textSecondary }]}>Use this car automatically for your driver itineraries.</Text>
                                    </View>
                                    <Switch
                                        value={isDefault}
                                        onValueChange={setIsDefault}
                                        trackColor={{ false: theme.border, true: theme.primary }}
                                    />
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step CTA Buttons */}
                    {step < 4 && (
                        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: theme.primary }]} onPress={handleNext} activeOpacity={0.85}>
                            <Text style={styles.nextBtnText}>Continue</Text>
                            <ChevronRight size={18} color="#FFF" />
                        </TouchableOpacity>
                    )}

                    {step === 4 && (
                        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: theme.primary }]} onPress={handleSave} activeOpacity={0.85}>
                            <Text style={styles.nextBtnText}>Confirm & Submit</Text>
                            <Check size={18} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* STEP 5: SUCCESS Confirmation page */}
            {step === 5 && (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.background, zIndex: 100, justifyContent: 'center', padding: 24 }]}>
                    <View style={styles.successCard}>
                        <CheckCircle2 size={72} color="#10B981" style={{ alignSelf: 'center', marginBottom: 24 }} />
                        <Text style={[styles.successTitle, { color: theme.text }]}>Vehicle Registered Successfully!</Text>
                        <Text style={[styles.successSub, { color: theme.textSecondary }]}>
                            Your vehicle information and documents have been uploaded to our secure Google Cloud Storage servers.
                        </Text>

                        <View style={[styles.infoBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <AlertCircle size={20} color={theme.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.infoBannerTitle, { color: theme.text }]}>Verification Status: Pending</Text>
                                <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
                                    Our safety team will review your registration within 24 hours. You will receive a notification once verified.
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.successCta, { backgroundColor: theme.primary }]} onPress={() => router.replace('/(driver)/cars')}>
                            <Text style={styles.successCtaText}>Return to Cars list</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Uploading progress modal */}
            <Modal visible={uploading} transparent animationType="fade">
                <View style={styles.progressBackdrop}>
                    <View style={[styles.progressCard, { backgroundColor: theme.surface }]}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.progressCardTitle, { color: theme.text }]}>Uploading Assets...</Text>
                        <Text style={[styles.progressCardSub, { color: theme.textSecondary }]}>{uploadStatusText}</Text>
                        
                        {/* Progress bar */}
                        <View style={[styles.uploadProgressBg as any, { backgroundColor: theme.border }]}>
                            <View style={[styles.uploadProgressBar as any, { width: `${uploadProgress}%`, backgroundColor: theme.primary }]} />
                        </View>
                        <Text style={[styles.progressPercentageText as any, { color: theme.text }]}>{Math.round(uploadProgress)}%</Text>

                        <TouchableOpacity style={[styles.cancelBtn as any, { borderColor: theme.border }]} onPress={handleCancelUpload}>
                            <Text style={[styles.cancelBtnText as any, { color: '#EF4444' }]}>Cancel Upload</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', flex: 1 },
    
    // Progress
    progressBg: { height: 4, width: '100%' },
    progressBar: { height: '100%' },
    
    scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    stepContainer: { gap: 16 },
    stepTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
    stepSubtitle: { fontSize: 15, fontWeight: '500', lineHeight: 20, marginBottom: 12 },
    
    inputWrapper: { gap: 8 },
    label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', opacity: 0.7, letterSpacing: 0.5, marginLeft: 4 },
    pickerBtn: { height: 56, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    
    // Dropdown list
    dropdownList: { borderRadius: 16, borderWidth: 1, padding: 8, marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    dropdownSearch: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 8, fontSize: 14 },
    dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8 },
    
    // Step 2 Technical Details
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    colorChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minWidth: '47%' },
    colorDot: { width: 14, height: 14, borderRadius: 7 },
    
    rowContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginVertical: 8 },
    rowLabel: { fontSize: 15, fontWeight: '700' },
    rowSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    
    stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    stepperBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    stepperValue: { fontSize: 18, fontWeight: '800', minWidth: 20, textAlign: 'center' },
    
    grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    cardSelect: { flex: 1, minWidth: '47%', height: 50, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    cardSelectText: { fontSize: 14, fontWeight: '600' },
    
    // Plate input
    plateBorderContainer: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    plateLeftSection: { flex: 2, justifyContent: 'center', alignItems: 'center' },
    plateMidSection: { flex: 1.2, justifyContent: 'center', alignItems: 'center' },
    plateRightSection: { flex: 1.2, justifyContent: 'center', alignItems: 'center' },
    plateDivider: { width: 1.5, height: '100%' },
    plateInput: { fontSize: 18, fontWeight: '800', width: '100%', paddingVertical: 10 },
    
    // Step 3 Upload slots
    sectionHeading: { fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 8 },
    slotRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    slotPlaceholder: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    slotImageContainer: { position: 'relative' },
    slotThumbnail: { width: 48, height: 48, borderRadius: 12 },
    slotDeleteBtn: { position: 'absolute', top: -4, right: -4, backgroundColor: 'rgba(0,0,0,0.6)', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    slotInfo: { flex: 1, marginLeft: 16, gap: 2 },
    slotLabel: { fontSize: 14, fontWeight: '700' },
    slotSub: { fontSize: 12, opacity: 0.6 },
    slotPickerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    
    // Step 4 Review
    reviewCard: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 4, marginBottom: 20 },
    reviewHeader: { fontSize: 20, fontWeight: '800' },
    reviewSub: { fontSize: 14, fontWeight: '500', marginBottom: 10 },
    reviewDivider: { height: 1, marginVertical: 12 },
    reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    
    reviewThumbWrapper: { width: 100, height: 100, borderRadius: 16, borderWidth: 1, marginRight: 12, overflow: 'hidden', position: 'relative' },
    reviewThumb: { width: '100%', height: '100%' },
    reviewThumbLabelBg: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, alignItems: 'center' },
    reviewThumbLabel: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    
    switchGroup: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1, marginTop: 12 },
    switchLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    switchSubtitle: { fontSize: 12, opacity: 0.6 },
    
    // Buttons
    nextBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 },
    nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    
    // Upload progress modal
    progressBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    progressCard: { width: '100%', padding: 30, borderRadius: 24, alignItems: 'center', gap: 12 },
    progressCardTitle: { fontSize: 18, fontWeight: '800', marginTop: 8 },
    progressCardSub: { fontSize: 13, textAlign: 'center', opacity: 0.7 },
    uploadProgressBg: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
    uploadProgressBar: { height: '100%' },
    progressPercentageText: { fontSize: 16, fontWeight: '800' },
    cancelBtn: { height: 48, width: '100%', borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
    cancelBtnText: { fontSize: 14, fontWeight: '700' },
    
    // Success step
    successCard: { gap: 12 },
    successTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
    successSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, opacity: 0.8 },
    infoBanner: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 24 },
    infoBannerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
    infoBannerText: { fontSize: 13, lineHeight: 18 },
    successCta: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
    successCtaText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
