import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Handle notifications when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'web') {
        return null;
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }
        try {
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            })).data;
        } catch (error) {
            console.log('Error fetching push token:', error);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return token;
};

export const sendImmediateNotification = async (title: string, body: string, data = {}) => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
        },
        trigger: null, // trigger immediately
    });
};

export const scheduleTripReminder = async (tripId: string, preferredTime: string, tripName: string) => {
    // Parse preferredTime (e.g., "08:00 AM")
    const [time, period] = preferredTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const now = new Date();
    const tripDate = new Date();
    tripDate.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, assume it's for tomorrow
    if (tripDate < now) {
        tripDate.setDate(tripDate.getDate() + 1);
    }

    // Schedule for 30 minutes before
    const reminderTime = new Date(tripDate.getTime() - 30 * 60000);

    // Only schedule if the reminder time is in the future
    if (reminderTime > now) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Trip Starting Soon!',
                body: `Your trip "${tripName}" starts in 30 minutes.`,
                data: { tripId },
            },
            trigger: {
                date: reminderTime,
            } as Notifications.NotificationTriggerInput,
        });
        console.log(`Reminder scheduled for: ${reminderTime.toLocaleString()}`);
    } else {
        // If less than 30 mins away, notify immediately
        await sendImmediateNotification(
            'Trip Starting Soon!',
            `Your trip "${tripName}" is starting very soon!`
        );
    }
};
