import api from './api';

export const uploadImage = async (uri: string): Promise<string> => {
    if (!uri) return '';
    // If it's already a remote URL, return it
    if (uri.startsWith('http')) return uri;

    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // @ts-ignore
    formData.append('image', { uri, name: filename, type });

    try {
        const res = await api.post('/upload/profile', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return res.data.url;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
};
