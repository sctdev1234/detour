import { initializeApp } from 'firebase/app';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    // apiKey: "YOUR_API_KEY",
    // authDomain: "YOUR_AUTH_DOMAIN",
    // projectId: "YOUR_PROJECT_ID",
    // storageBucket: "YOUR_STORAGE_BUCKET",
    // messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    // appId: "YOUR_APP_ID"
    apiKey: "AIzaSyCr7mWwOthOAGH-Q1ok7BkPBJC3l_dE0a4",
    authDomain: "detour-7a5b4.firebaseapp.com",
    projectId: "detour-7a5b4",
    storageBucket: "detour-7a5b4.firebasestorage.app",
    messagingSenderId: "781420905294",
    appId: "1:781420905294:web:5eb7d3b851a9eca497d41f",
    measurementId: "G-SGR49KY8KC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth';

// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { Platform } from 'react-native';

const auth = Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });

if (Platform.OS === 'web') {
    // browserLocalPersistence is default, but ensuring it
    auth.setPersistence(browserLocalPersistence);
}

export { auth };

import { getDatabase } from 'firebase/database';
export const database = getDatabase(app);

import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);
