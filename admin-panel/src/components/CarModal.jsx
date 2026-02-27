import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Camera, Palette, Tag, Type, User, Users as UsersIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/axios';

export default function CarModal({ car, users, onClose, onSave }) {
    const [formData, setFormData] = useState({
        marque: '',
        model: '',
        year: '',
        color: '',
        places: 4,
        ownerId: '',
        images: []
    });
    const [isEditing, setIsEditing] = useState(false);

    // Image Upload State
    const [existingImages, setExistingImages] = useState([]); // URLs from backend
    const [newImageFiles, setNewImageFiles] = useState([]); // File objects
    const [previewUrls, setPreviewUrls] = useState([]); // URLs for File objects
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (car) {
            setFormData({
                marque: car.marque || '',
                model: car.model || '',
                year: car.year || '',
                color: car.color || '',
                places: car.places || 4,
                ownerId: car.ownerId?._id || car.ownerId || '',
                images: car.images || []
            });
            setIsEditing(true);
            setExistingImages(car.images || []);
        } else {
            setFormData({
                marque: '',
                model: '',
                year: '',
                color: '',
                places: 4,
                ownerId: '',
                images: []
            });
            setIsEditing(false);
            setExistingImages([]);
        }
        setNewImageFiles([]);
        setPreviewUrls([]);
    }, [car]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setNewImageFiles(prev => [...prev, ...files]);

            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newPreviews]);
        }
        // Reset file input so same file can be selected again if needed
        e.target.value = '';
    };

    const removeExistingImage = (index) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        URL.revokeObjectURL(previewUrls[index]);
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let finalFormData = { ...formData };
        let finalImages = [...existingImages];

        if (newImageFiles.length > 0) {
            setIsUploading(true);

            try {
                // Upload all new images in parallel
                const uploadPromises = newImageFiles.map(async (file) => {
                    const uploadData = new FormData();
                    uploadData.append('image', file);
                    uploadData.append('folder', 'cars');

                    const res = await api.post('/upload', uploadData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    return res.data.url;
                });

                const uploadedUrls = await Promise.all(uploadPromises);
                finalImages = [...finalImages, ...uploadedUrls];

            } catch (err) {
                console.error("Image upload error", err);
                alert('Failed to upload one or more images. Please try again.');
                setIsUploading(false);
                return; // Stop form submission
            }
        }

        finalFormData.images = finalImages;
        setIsUploading(false);
        onSave(finalFormData);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
                        <h2 className="text-xl font-bold text-white">
                            {isEditing ? 'Edit Car' : 'Add New Car'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Marque */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Make / Marque</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    name="marque"
                                    value={formData.marque}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
                                    placeholder="e.g., Toyota, BMW"
                                />
                            </div>
                        </div>

                        {/* Model */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Model</label>
                            <div className="relative">
                                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
                                    placeholder="e.g., Corolla, X5"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Year */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Year</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="number"
                                        name="year"
                                        value={formData.year}
                                        onChange={handleChange}
                                        required
                                        min="1990"
                                        max={new Date().getFullYear() + 1}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
                                        placeholder="YYYY"
                                    />
                                </div>
                            </div>

                            {/* Places */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Seats (Places)</label>
                                <div className="relative">
                                    <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="number"
                                        name="places"
                                        value={formData.places}
                                        onChange={handleChange}
                                        required
                                        min="1"
                                        max="50"
                                        className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Color */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Color</label>
                            <div className="relative">
                                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
                                    placeholder="e.g., Black, Silver"
                                />
                            </div>
                        </div>

                        {/* Car Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Car Images</label>

                            {/* Image Grid */}
                            <div className="flex flex-wrap gap-3 mb-3">
                                {/* Existing Images */}
                                {existingImages.map((url, idx) => (
                                    <div key={`existing-${idx}`} className="w-24 h-24 shrink-0 relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shadow-sm flex items-center justify-center">
                                        <img src={url} alt={`car-${idx}`} className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImage(idx)}
                                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transform hover:scale-110 transition-all z-10"
                                                title="Remove Image"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* New Image Previews */}
                                {previewUrls.map((url, idx) => (
                                    <div key={`new-${idx}`} className="w-24 h-24 shrink-0 relative group rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-slate-800 shadow-sm flex items-center justify-center">
                                        <img src={url} alt={`preview-${idx}`} className="w-full h-full object-contain" />
                                        <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow z-10">
                                            NEW
                                        </div>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeNewImage(idx)}
                                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transform hover:scale-110 transition-all z-10"
                                                title="Remove Image"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Add New Button */}
                                <div className="w-24 h-24 shrink-0 relative rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/50 hover:bg-slate-800 flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-colors group">
                                    <Camera className="w-6 h-6 text-slate-500 group-hover:text-blue-400 mb-1 transition-colors" />
                                    <span className="text-[10px] text-slate-500 group-hover:text-blue-400 uppercase font-semibold text-center leading-tight">Add<br />Photo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-slate-500">
                                Upload multiple photos (JPG, PNG, WEBP).
                                {newImageFiles.length > 0 && <span className="ml-1 text-emerald-400 font-medium">{newImageFiles.length} new file(s) ready to upload.</span>}
                            </div>
                        </div>

                        {/* Owner Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Assign Owner</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    name="ownerId"
                                    value={formData.ownerId}
                                    onChange={handleChange}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
                                >
                                    <option value="" disabled>Select an owner...</option>
                                    {users?.map(u => (
                                        <option key={u._id} value={u._id}>
                                            {u.fullName} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">If no owner is selected, it will be assigned to you (the admin).</p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isUploading}
                                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUploading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isUploading ? 'Uploading...' : (isEditing ? 'Save Changes' : 'Add Car')}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
