import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import ConfirmationModal from '../components/ConfirmationModal';
import LocationTracker from '../components/LocationTracker';
import Toast from '../components/Toast';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notificationService';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { role, user, isLoading, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    checkAuth();

    // Register for push notifications
    registerForPushNotificationsAsync();

    // Listen for notification interactions
    let notificationListener: Notifications.Subscription | undefined;

    if (Constants.appOwnership !== 'expo' || Platform.OS !== 'android') {
      notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.tripId) {
          // Navigate based on data if needed
          console.log('Notification data:', data);
        }
      });
    }

    return () => {
      notificationListener && notificationListener.remove();
    };
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    const segmentsArray = segments as string[];
    const inAuthGroup = segmentsArray[0] === '(auth)';
    const isLoginScreen = segmentsArray.length > 1 && segmentsArray[1] === 'login';
    const isSignupScreen = segmentsArray.length > 1 && segmentsArray[1] === 'signup';

    if (!user) {
      if (!inAuthGroup || (!isLoginScreen && !isSignupScreen)) {
        router.replace('/(auth)/login');
      }
    } else if (!role) {
      if (segmentsArray.length > 1 && segmentsArray[1] !== 'role-selection') {
        router.replace('/(auth)/role-selection');
      }
    } else if (role === 'driver') {
      if (segmentsArray[0] !== '(driver)') {
        router.replace('/(driver)');
      }
    } else if (role === 'client') {
      if (segmentsArray[0] !== '(client)') {
        router.replace('/(client)');
      }
    }
  }, [user, role, segments, isLoading, router]);

  const theme = colorScheme === 'dark' ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.primary,
      background: Colors.dark.background,
      card: Colors.dark.surface,
      text: Colors.dark.text,
      border: Colors.dark.border,
      notification: Colors.dark.accent,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.primary,
      background: Colors.light.background,
      card: Colors.light.surface,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.accent,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(driver)" options={{ headerShown: false }} />
        <Stack.Screen name="(client)" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <LocationTracker />
      <Toast />
      <ConfirmationModal />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
