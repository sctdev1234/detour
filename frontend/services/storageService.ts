import { API_URL, BASE_URL } from './apiConfig';

/**
 * Uploads an image to the backend server and returns the accessible URL.
 * @param uri Local URI of the image
 * @param path Storage path (optional, can be used for folder organization)
 */
export const uploadImage = async (uri: string, path: string): Promise<string> => {
    try {
        console.log(`[Upload] Starting upload for ${uri}`);
        const formData = new FormData();
        const filename = uri.split('/').pop() || `upload-${Date.now()}.jpg`;

        // Append file data
        formData.append('file', {
            uri: uri,
            name: filename,
            type: 'image/jpeg',
        } as any);

        // Optionally send folder info if backend supports it
        // formData.append('folder', 'cars'); 

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
                'Bypass-Tunnel-Reminder': 'true'
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Ensure we get a full URL back
        // If backend returns relative path (e.g., /uploads/file.jpg), prepend BASE_URL
        const relativePath = data.url.startsWith('/') ? data.url : '/' + data.url;
        const fullUrl = `${BASE_URL}${relativePath}`;

        console.log(`[Upload] Success: ${fullUrl}`);
        return fullUrl;
    } catch (error) {
        console.error('[Upload] Error:', error);
        throw error;
    }
};
