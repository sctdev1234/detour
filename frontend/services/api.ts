import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_URL } from './apiConfig';
import { useAuthStore } from '../store/useAuthStore'; // Will be created/refactored

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000, // 15 seconds timeout
    headers: {
        'Bypass-Tunnel-Reminder': 'true',
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Try getting token from zustand store directly if available (avoids async storage hit if already loaded)
        // Since this might run outside React context, we read from AsyncStorage as fallback
        const storageData = await AsyncStorage.getItem('auth-storage');
        let token = null;

        if (storageData) {
            try {
                const parsed = JSON.parse(storageData);
                if (parsed?.state?.token) {
                    token = parsed.state.token;
                }
            } catch (e) {
                console.error('[API] Failed to parse auth-storage', e);
            }
        }

        if (token) {
            config.headers['x-auth-token'] = token;
        }

        // Optional: Add request ID or timestamp for debugging
        config.headers['X-Request-Id'] = Date.now().toString();

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response) {
            // Server responded with a status other than 2xx
            if (error.response.status === 401) {
                // Token expired or unauthorized
                console.warn('[API] 401 Unauthorized. Triggering logout or token refresh.');
                // Placeholder: If we had a refresh route:
                // if (!originalRequest._retry) {
                //     originalRequest._retry = true;
                //     const newToken = await refreshToken();
                //     originalRequest.headers['x-auth-token'] = newToken;
                //     return api(originalRequest);
                // }

                // For now, clear token and redirect (handled by store/auth listeners)
                // useAuthStore.getState().logout();
            } else if (error.response.status === 500) {
                console.error('[API] Server error:', error.response.data);
            }
        } else if (error.request) {
            // Request was made but no response received (timeout, network error)
            console.error('[API] Network error or timeout:', error.message);
        } else {
            // Something else happened
            console.error('[API] Error:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
