import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export const authService = {
    // Login
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            await AsyncStorage.setItem('token', response.data.token);
            await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    // Register
    register: async (userData: any) => {
        const response = await api.post('/auth/signup', userData);
        if (response.data.token) {
            await AsyncStorage.setItem('token', response.data.token);
            await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    // Logout
    logout: async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
    },

    // Get Current User (validate token)
    getCurrentUser: async () => {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            return null;
        }
    },

    // Update Profile
    updateProfile: async (data: any) => {
        // Need to implement update profile route on backend if needed,
        // For now, assuming just local state update or specialized endpoint
        // api.put('/auth/profile', data);
        return data;
    }
};
