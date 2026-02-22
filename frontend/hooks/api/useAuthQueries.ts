
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { User } from '../../types';

// Query Keys
export const authKeys = {
    all: ['auth'] as const,
    user: () => [...authKeys.all, 'user'] as const,
};

// --- Queries ---

import { useEffect } from 'react';

// ... other imports

// --- Queries ---

export const useUser = (enabled: boolean = true) => {
    const { logout, updateUser } = useAuthStore();

    const query = useQuery({
        queryKey: authKeys.user(),
        queryFn: async () => {
            try {
                const { data } = await api.get('/auth/me');
                return data as User;
            } catch (error) {
                // If 401, we should probably logout
                logout();
                throw error;
            }
        },
        enabled,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
    });

    // Sync with Zustand store when data is fetched (React Query v5 compatible)
    useEffect(() => {
        if (query.data) {
            updateUser(query.data);
        }
    }, [query.data, updateUser]);

    return query;
};

// --- Mutations ---

export const useLogin = () => {
    const queryClient = useQueryClient();
    const { setLoading } = useAuthStore();

    return useMutation({
        mutationFn: async (credentials: { email: string; password: string }) => {
            const { data } = await api.post('/auth/login', credentials);
            return data;
        },
        onSuccess: (data) => {
            // Update Zustand store with session data
            useAuthStore.getState().setSession(data.user, data.token);

            // Invalidate user query to ensure it's fresh
            queryClient.setQueryData(authKeys.user(), data.user);
        },
        onError: () => {
            setLoading(false);
        }
    });
};

export const useRegister = () => {
    const queryClient = useQueryClient();
    const { setLoading } = useAuthStore();

    return useMutation({
        mutationFn: async (credentials: { email: string; password: string; fullName: string; role: string }) => {
            const { data } = await api.post('/auth/signup', credentials);
            return data;
        },
        onSuccess: (data) => {
            useAuthStore.getState().setSession(data.user, data.token);
            queryClient.setQueryData(authKeys.user(), data.user);
        },
        onError: () => {
            setLoading(false);
        }
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    const { logout } = useAuthStore();

    return useMutation({
        mutationFn: async () => {
            // Optional: Call logout endpoint if exists
            // await api.post('/auth/logout');
            return true;
        },
        onSuccess: () => {
            logout();
            queryClient.clear(); // Clear all cache on logout
        },
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<User>) => {
            const res = await api.put('/auth/update', data);
            return res.data;
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(authKeys.user(), (old: User | undefined) => {
                return old ? { ...old, ...updatedUser } : updatedUser;
            });
            // Update local store as well for now
            useAuthStore.getState().updateUser(updatedUser);
        },
    });
};

export const useSubmitVerification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (docs: any) => {
            // Upload logic should ideally be handled before passing to mutation or inside here
            // We'll assume the component handles the upload to Cloudinary/GridFS first or we reuse the service logic here.
            // For simplicity, let's assume `docs` already contains URLs or we use the service.

            const { uploadImage } = await import('../../services/uploadService');
            const uploadedDocs: any = { ...docs };

            const uploadPromises = Object.keys(docs).map(async (key) => {
                const uri = (docs as any)[key];
                // Upload if it's a local URI (not a URL and not a base64 string)
                if (uri && !uri.startsWith('http') && !uri.startsWith('data:')) {
                    try {
                        const url = await uploadImage(uri, 'verification');
                        uploadedDocs[key] = url;
                    } catch (err) {
                        console.error(`[Verification] Failed to upload ${key}:`, err);
                        throw new Error(`Failed to upload ${key}`);
                    }
                }
            });
            await Promise.all(uploadPromises);


            const res = await api.post('/auth/verify', uploadedDocs);
            return res.data;
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(authKeys.user(), (old: User | undefined) => {
                return old ? { ...old, ...updatedUser } : updatedUser;
            });
            useAuthStore.getState().updateUser({ ...updatedUser, verificationStatus: 'pending' });
        },
    });
};

export const useAddSavedPlace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (place: { label: string; address: string; latitude: number; longitude: number; icon: string }) => {
            const { data } = await api.post('/auth/places', place);
            return data; // returns updated savedPlaces array
        },
        onSuccess: (savedPlaces) => {
            queryClient.setQueryData(authKeys.user(), (old: User | undefined) => {
                return old ? { ...old, savedPlaces } : old;
            });
            useAuthStore.getState().updateUser({ savedPlaces });
        },
    });
};

export const useRemoveSavedPlace = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (placeId: string) => {
            const { data } = await api.delete(`/auth/places/${placeId}`);
            return data; // returns updated savedPlaces array
        },
        onSuccess: (savedPlaces) => {
            queryClient.setQueryData(authKeys.user(), (old: User | undefined) => {
                return old ? { ...old, savedPlaces } : old;
            });
            useAuthStore.getState().updateUser({ savedPlaces });
        }
    });
};

export const useForgotPassword = () => {
    return useMutation({
        mutationFn: async (email: string) => {
            const { data } = await api.post('/auth/forgot-password', { email });
            return data.token; // Returning dev token for now
        }
    });
};

export const useResetPassword = () => {
    return useMutation({
        mutationFn: async ({ token, password }: { token: string; password: string }) => {
            const { data } = await api.post('/auth/reset-password', { token, password });
            return data;
        }
    });
};

export const useDeleteAccount = () => {
    const queryClient = useQueryClient();
    const { logout } = useAuthStore();

    return useMutation({
        mutationFn: async () => {
            await api.delete('/auth/delete-account');
        },
        onSuccess: () => {
            logout();
            queryClient.clear();
        }
    });
};

export const useChangePassword = () => {
    return useMutation({
        mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
            const res = await api.put('/auth/change-password', data);
            return res.data;
        }
    });
};
