import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { API_URL } from './apiConfig';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
    },
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
    async (config) => {
        // useAuthStore persists state to 'auth-storage' wrapping it in { state: { ... } }
        const storageData = await AsyncStorage.getItem('auth-storage');
        let token = null;

        if (storageData) {
            try {
                const parsed = JSON.parse(storageData);
                token = parsed.state?.token;
            } catch (e) {
                console.error('[API] Failed to parse auth-storage', e);
            }
        }

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
