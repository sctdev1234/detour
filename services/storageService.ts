import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebaseConfig';

/**
 * Uploads an image to Firebase Storage and returns the download URL.
 * @param uri Local URI of the image
 * @param path Storage path (e.g., "cars/carId/image.jpg")
 */
export const uploadImage = async (uri: string, path: string): Promise<string> => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();

        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, blob);

        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};
