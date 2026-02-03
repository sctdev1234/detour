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
