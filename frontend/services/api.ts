import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

// Use simple localhost for now, can be updated for specific dev environment
// For Android Emulator use 10.0.2.2, for iOS/Web localhost is fine.
// Using window.location.hostname logic for web if needed.
const getBaseUrl = () => {
    if (Platform.OS === 'web') return `${process.env.EXPO_PUBLIC_API_URL}/api`;
    if (Platform.OS === 'android') return `${process.env.EXPO_PUBLIC_API_URL}/api`;
    return `${process.env.EXPO_PUBLIC_API_URL}/api`;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
