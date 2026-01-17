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
// export const auth = getAuth(app);
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
