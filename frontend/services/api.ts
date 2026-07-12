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

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for structured logging
const getCaller = () => {
    try {
        const err = new Error();
        const stack = err.stack?.split('\n') || [];
        for (let i = 2; i < stack.length; i++) {
            const line = stack[i];
            if (!line.includes('api.ts') && !line.includes('node_modules') && !line.includes('axios')) {
                return line.trim();
            }
        }
    } catch {}
    return 'unknown';
};

const logStructured = (config: any, response?: AxiosResponse, error?: any) => {
    const duration = config.startTime ? `${Date.now() - config.startTime}ms` : 'unknown';
    const status = response ? response.status : (error?.response?.status || 'No Response');
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    const retryCount = config._retryCount || 0;
    const correlationId = config.headers?.['X-Request-Id'] || 'none';
    const caller = getCaller();
    
    console.log(`[API Log] Method: ${method} | URL: ${url} | Status: ${status} | Duration: ${duration} | Retry: ${retryCount} | CorrelationID: ${correlationId} | Caller: ${caller}`);
};

// GET request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

const originalRequest = api.request.bind(api);

// Override api.request to deduplicate GET requests
api.request = <T = any, R = AxiosResponse<T>, D = any>(...args: any[]): Promise<R> => {
    const config = typeof args[0] === 'string' ? (args[1] || {}) : (args[0] || {});
    const method = (config.method || (typeof args[0] === 'string' ? 'get' : 'get')).toLowerCase();

    if (method !== 'get') {
        return (originalRequest as any)(...args) as Promise<R>;
    }

    const url = typeof args[0] === 'string' ? args[0] : (config.url || '');
    const key = `${url}:${JSON.stringify(config.params || {})}`;
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key)!;
    }

    const promise = (originalRequest as any)(...args).finally(() => {
        pendingRequests.delete(key);
    }) as Promise<R>;

    pendingRequests.set(key, promise);
    return promise;
};

// Request Interceptor
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Read directly from Zustand store
        const { token } = useAuthStore.getState();

        if (token) {
            config.headers['x-auth-token'] = token;
        }

        // Add request ID or timestamp for debugging
        config.headers['X-Request-Id'] = Date.now().toString();
        
        // Track request start time
        // @ts-ignore
        config.startTime = Date.now();

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
api.interceptors.response.use(
    (response: AxiosResponse) => {
        // @ts-ignore
        logStructured(response.config, response);
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config;
        if (!originalRequest) {
            return Promise.reject(error);
        }

        const originalRequestConfig = originalRequest as InternalAxiosRequestConfig & { _retryCount?: number; _retry?: boolean; startTime?: number };

        // Log the failure
        logStructured(originalRequestConfig, undefined, error);

        if (error.response) {
            const status = error.response.status;

            // Handle 401 unauthorized (refresh token)
            if (status === 401 && !originalRequestConfig._retry) {
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

            // Handle 429 / 503 retry with exponential backoff and jitter
            if (status === 429 || status === 503) {
                const maxRetries = 3;
                const currentRetry = originalRequestConfig._retryCount || 0;

                if (currentRetry < maxRetries) {
                    originalRequestConfig._retryCount = currentRetry + 1;
                    const backoffDelay = Math.pow(2, originalRequestConfig._retryCount) * 1000 + Math.random() * 1000;

                    console.warn(`[API] Received status ${status}. Retrying ${originalRequestConfig.url} (Attempt ${originalRequestConfig._retryCount}/${maxRetries}) in ${Math.round(backoffDelay)}ms...`);
                    
                    await delay(backoffDelay);
                    originalRequestConfig.startTime = Date.now();
                    return api(originalRequestConfig);
                }
            }
        } else if (error.message && (error.message.includes('timeout') || error.message.includes('Network Error'))) {
            // Retry on connection timeouts or network dropouts
            const maxRetries = 3;
            const currentRetry = originalRequestConfig._retryCount || 0;

            if (currentRetry < maxRetries) {
                originalRequestConfig._retryCount = currentRetry + 1;
                const backoffDelay = Math.pow(2, originalRequestConfig._retryCount) * 1000 + Math.random() * 1000;

                console.warn(`[API] Connection issue: ${error.message}. Retrying ${originalRequestConfig.url} (Attempt ${originalRequestConfig._retryCount}/${maxRetries}) in ${Math.round(backoffDelay)}ms...`);
                
                await delay(backoffDelay);
                originalRequestConfig.startTime = Date.now();
                return api(originalRequestConfig);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
