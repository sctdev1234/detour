import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ref, set } from 'firebase/database';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { database } from '../services/firebaseConfig';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the task globally only on native
if (Platform.OS !== 'web') {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: { data: any, error: any }) => {
        if (error) {
            console.error('Background location task failed', error);
            return;
        }
        if (data) {
            const { locations } = data;
            if (locations && locations.length > 0) {
                const location = locations[0];
                useLocationStore.getState().setLocation(location);

                // Sync to Firebase
                const user = useAuthStore.getState().user;
                if (user) {
                    try {
                        const { latitude, longitude, heading, speed } = location.coords;
                        const userLocationRef = ref(database, `drivers/${user.uid}/location`);
                        await set(userLocationRef, {
                            latitude,
                            longitude,
                            heading,
                            speed,
                            timestamp: Date.now()
                        });
                    } catch (e) {
                        // console.error('Failed to sync location', e); 
                    }
                }
            }
        }
    });
}

export default function LocationTracker() {
    const { setLocation, setErrorMsg, setTracking } = useLocationStore();

    useEffect(() => {
        if (Platform.OS === 'web') return;

        async function startTracking() {
            try {
                // Request Foreground Permissions
                const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
                if (fgStatus !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    return;
                }

                // Request Background Permissions
                const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
                if (bgStatus !== 'granted') {
                    console.warn('Background location permission denied');
                }

                setTracking(true);

                // Get initial location
                const initialLocation = await Location.getCurrentPositionAsync({});
                setLocation(initialLocation);

                // Check if task is already running
                const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
                if (hasStarted) {
                    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                }

                // Start background updates
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10,
                    deferredUpdatesInterval: 5000,
                    showsBackgroundLocationIndicator: true,
                    foregroundService: {
                        notificationTitle: "Detour Driver",
                        notificationBody: "Tracking your trip...",
                        notificationColor: "#0066FF"
                    }
                });

            } catch (err) {
                console.error('Error starting location tracking:', err);
                setErrorMsg('Failed to start location tracking');
            }
        }

        startTracking();

        return () => {
            Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then(started => {
                if (started) {
                    Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                }
            });
            setTracking(false);
        };
    }, []);

    return null;
}
