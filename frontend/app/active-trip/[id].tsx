import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import DriverTripExecutionScreen from '../../components/DriverTripExecutionScreen';
import { useTrips } from '../../hooks/api/useTripQueries';

export default function ActiveTripScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { data: trips, isLoading } = useTrips();

    const trip = trips?.find((t: any) => t.id === id || t._id === id);

    useEffect(() => {
        if (trip && (trip.status === 'COMPLETED' || trip.status === 'CANCELLED')) {
            router.replace('/(driver)');
        }
    }, [trip?.status]);

    if (isLoading || !trip) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return <DriverTripExecutionScreen trip={trip} />;
}
