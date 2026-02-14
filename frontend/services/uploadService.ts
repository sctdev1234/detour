import { Platform } from 'react-native';
import api from './api';

export const uploadImage = async (uri: string, folder: string = 'misc'): Promise<string> => {
    if (!uri) return '';
    // If it's already a remote URL, return it
    if (uri.startsWith('http')) return uri;

    try {
        const formData = new FormData();
        let filename = uri.split('/').pop() || 'upload.jpg';

        if (!filename.includes('.')) {
            filename += '.jpg';
        }

        if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            const type = blob.type || 'image/jpeg';
            formData.append('image', blob, filename);
        } else {
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            // @ts-ignore
            formData.append('image', { uri, name: filename, type });
        }

        formData.append('folder', folder);

        const res = await api.post('/upload', formData);
        return res.data.url;

    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
};

