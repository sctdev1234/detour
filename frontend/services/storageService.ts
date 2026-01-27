import * as FileSystem from 'expo-file-system';

/**
 * Converts a local image URI to a Base64 Data URI string.
 * This effectively "uploads" the image by preparing it for storage in MongoDB.
 * @param uri Local URI of the image
 */
export const uploadImage = async (uri: string, path?: string): Promise<string> => {
    try {
        console.log(`[Storage] Converting ${uri} to Base64...`);
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Determine mime type (simple guess, default to jpeg)
        const fileExtension = uri.split('.').pop()?.toLowerCase();
        let mimeType = 'image/jpeg';
        if (fileExtension === 'png') mimeType = 'image/png';

        const dataUri = `data:${mimeType};base64,${base64}`;
        console.log(`[Storage] Conversion success (${dataUri.length} chars)`);

        return dataUri;
    } catch (error) {
        console.error('[Storage] Base64 conversion error:', error);
        throw error;
    }
};
