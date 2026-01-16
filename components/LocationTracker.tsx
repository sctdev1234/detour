import * as Location from 'expo-location';
import { useEffect } from 'react';
import { useLocationStore } from '../store/useLocationStore';

export default function LocationTracker() {
    const { setLocation, setErrorMsg, setTracking } = useLocationStore();

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        async function startTracking() {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            setTracking(true);

            // Get initial location
            const initialLocation = await Location.getCurrentPositionAsync({});
            setLocation(initialLocation);

            // Subscribe to updates
            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10, // Update every 10 meters
                    timeInterval: 5000,    // or every 5 seconds
                },
                (newLocation) => {
                    setLocation(newLocation);
                }
            );
        }

        startTracking();

        return () => {
            if (subscription) {
                subscription.remove();
            }
            setTracking(false);
        };
    }, [setLocation, setErrorMsg, setTracking]);

    return null; // This is a logic-only component
}
