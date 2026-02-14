import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

// Define the Car interface based on the store definition
export interface Car {
    id: string; // MongoDB _id
    marque: string;
    model: string;
    year: string;
    color: string;
    places: number;
    isDefault: boolean;
    images: string[];
    documents: {
        registration?: string;
        insurance?: string;
        technicalVisit?: string;
    };
    ownerId: string;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'unverified';
    assignment?: {
        driverEmail: string;
        profitSplit: number; // 0-100
        startDate: string;
        status: 'active' | 'pending' | 'ended';
    };
}

export const carKeys = {
    all: ['cars'] as const,
    list: (ownerId: string) => [...carKeys.all, 'list', ownerId] as const,
    detail: (id: string) => [...carKeys.all, 'detail', id] as const,
};

export const useCars = () => {
    return useQuery({
        queryKey: carKeys.list('me'),
        queryFn: async () => {
            const { data } = await api.get('/cars');
            // Ensure ID mapping is consistent (mongo _id to id)
            return data.map((c: any) => ({ ...c, id: c._id || c.id })) as Car[];
        },
    });
};

export const useAddCar = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (carData: Omit<Car, 'id' | 'ownerId' | 'verificationStatus'>) => {
            const { data } = await api.post('/cars', carData);
            return { ...data, id: data._id || data.id };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: carKeys.list('me') });
        },
    });
};

export const useRemoveCar = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/cars/${id}`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: carKeys.list('me') });
        },
    });
};

export const useUpdateCar = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Car> }) => {
            const { data } = await api.patch(`/cars/${id}`, updates);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: carKeys.list('me') });
        },
    });
};

export const useSetDefaultCar = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.patch(`/cars/${id}`, { isDefault: true });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: carKeys.list('me') });
        },
    });
};

export const useAssignCar = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, assignment }: { id: string; assignment: Car['assignment'] }) => {
            const { data } = await api.patch(`/cars/${id}`, { assignment });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: carKeys.list('me') });
        },
    });
};

export const useRevokeAssignment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.patch(`/cars/${id}`, {
                assignment: { status: 'ended' }
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: carKeys.list('me') });
        },
    });
};
