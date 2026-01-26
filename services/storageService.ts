import { API_URL, BASE_URL } from './apiConfig';

/**
 * Uploads an image to the backend server and returns the accessible URL.
 * @param uri Local URI of the image
 * @param path Storage path (optional/ignored for now, or sent as folder param)
 */
export const uploadImage = async (uri: string, path: string): Promise<string> => {
    try {
        const formData = new FormData();
        const filename = uri.split('/').pop() || `upload-${Date.now()}.jpg`;

        // Append file data. 
        // Note: For React Native, FormData requires { uri, name, type } object
        formData.append('file', {
            uri: uri,
            name: filename,
            type: 'image/jpeg',
        } as any);

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
        }

        const data = await response.json();

        // Return full URL to the uploaded file
        // Ensure data.url starts with /uploads
        const relativePath = data.url.startsWith('/') ? data.url : '/' + data.url;
        return `${BASE_URL}${relativePath}`;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};
