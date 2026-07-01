import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_URL } from './apiConfig';
import { useAuthStore } from '../store/useAuthStore';

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
        // Read directly from Zustand store
        const { token } = useAuthStore.getState();

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
                const originalRequestConfig = originalRequest as InternalAxiosRequestConfig & { _retry?: boolean };
                if (!originalRequestConfig._retry) {
                    originalRequestConfig._retry = true;
                    
                    const { refreshToken, setSession, logout, user } = useAuthStore.getState();
                    
                    if (refreshToken && user) {
                        try {
                            const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                            if (res.data && res.data.token) {
                                setSession(user, res.data.token, res.data.refreshToken);
                                originalRequestConfig.headers['x-auth-token'] = res.data.token;
                                return api(originalRequestConfig);
                            }
                        } catch (refreshError) {
                            console.error('[API] Token refresh failed', refreshError);
                            logout();
                        }
                    } else {
                        logout();
                    }
                }
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
