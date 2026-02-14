import { Platform } from 'react-native';
import api from './api';

/**
 * Uploads a local image URI to the backend, which stores it in Firebase Storage.
 * @param uri Local URI of the image
 * @param folder Cloud folder to store the image in
 */
export const uploadImage = async (uri: string, folder: string = 'misc'): Promise<string> => {
    if (!uri) return '';
    // If it's already a remote URL, return it
    if (uri.startsWith('http')) return uri;

    try {
        const formData = new FormData();
        let filename = uri.split('/').pop() || 'upload.jpg';

        // Ensure filename has an extension for Multer filter
        if (!filename.includes('.')) {
            filename += '.jpg';
        }

        if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            // Use mime type from blob if possible
            const type = blob.type || 'image/jpeg';
            formData.append('image', blob, filename);
        } else {
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            // @ts-ignore
            formData.append('image', { uri, name: filename, type });
        }


        formData.append('folder', folder);

        console.log(`[Storage] Uploading ${uri} to Firebase via Backend...`);
        const res = await api.post('/upload', formData);

        if (res.data && res.data.url) {
            console.log(`[Storage] Upload success: ${res.data.url}`);
            return res.data.url;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('[Storage] Upload failed:', error);
        throw error;
    }
};
