import Constants from 'expo-constants';

// 1. Env Variable (Production/Vercel)
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

// 2. Dynamic IP (Development)
const getLocalApiUrl = () => {
    const hostUri = Constants.expoConfig?.hostUri; // e.g., "192.168.1.5:8081"
    if (!hostUri) return 'http://localhost:5000/api';

    // Extract IP address from hostUri
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
};

export const API_URL = ENV_API_URL ? `${ENV_API_URL}/api` : getLocalApiUrl();
export const BASE_URL = ENV_API_URL || API_URL.replace('/api', '');

console.log('[API Config] Using API URL:', API_URL);
