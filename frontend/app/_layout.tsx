import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import ConfirmationModal from '../components/ConfirmationModal';
import Header from '../components/Header';
import LocationTracker from '../components/LocationTracker';
import Toast from '../components/Toast';
import { Colors } from '../constants/theme';
import '../global.css';
import { useAuthStore } from '../store/useAuthStore';

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notificationService';
if (Platform.OS === 'web') {
  require('leaflet/dist/leaflet.css');
}

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

    // List of routes that are accessible to authenticated users regardless of role
    const sharedRoutes = ['change-password', 'edit-profile', 'chat', 'modal'];

    if (!user) {
      if (!inAuthGroup || (!isLoginScreen && !isSignupScreen)) {
        router.replace('/(auth)/login');
      }
    } else if (!role) {
      if (segmentsArray.length > 1 && segmentsArray[1] !== 'role-selection') {
        router.replace('/(auth)/role-selection');
      }
    } else {
      // If user has a role, check onboarding status
      const onboardingStatus = user.onboardingStatus;
      const isCompleted = onboardingStatus?.completed;

      const currentRoute = segmentsArray.join('/');
      const isTasksPage = segmentsArray.includes('tasks');

      // Define currentGroup for role checking
      const currentGroup = segmentsArray[0];

      // Whitelist of routes allowed during onboarding

      const onboardingWhitelist = [
        'tasks',
        '(client)/add-route',
        '(client)/places',
        '(driver)/verification', // documents
        '(driver)/add-car',
        'modal',
        'chat', // Maybe allow support?
        '(client)/profile',
        '(driver)/profile',
        'edit-profile'
      ];

      const isWhitelisted = onboardingWhitelist.some(route => currentRoute.includes(route));

      if (!isCompleted) {
        // If not completed and not on a whitelisted page, force to tasks
        if (!isWhitelisted && !isTasksPage) {
          // Prevent loop if already attempting to go there
          router.replace('/tasks' as any);
        }
      } else {

        // Onboarding completed
        // Special rule for Driver: If route missing, go to add-route
        if (role === 'driver') {
          const hasRoute = onboardingStatus?.steps.find(s => s.id === 'route')?.status === 'completed';
          // Only redirect if we are on the 'root' or dashboard, to avoid interfering with other navigation
          if (!hasRoute && (currentRoute === '(driver)' || currentRoute === '(driver)/index')) {
            router.replace('/(driver)/add-route');
          } else if (currentGroup !== '(driver)' && !sharedRoutes.includes(currentGroup)) {
            router.replace('/(driver)');
          }
        } else if (role === 'client') {
          if (currentGroup !== '(client)' && !sharedRoutes.includes(currentGroup)) {
            router.replace('/(client)');
          }
        }
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
      <SafeAreaProvider style={{ paddingTop: user ? 60 : 0 }}>
        {user && <Header />}
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(driver)" options={{ headerShown: false }} />
          <Stack.Screen name="(client)" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="change-password" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="tasks" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />

        </Stack>
        <LocationTracker />
        <Toast />
        <ConfirmationModal />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
