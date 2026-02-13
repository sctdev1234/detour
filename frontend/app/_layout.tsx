import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ConfirmationModal from '../components/ConfirmationModal';
import Header from '../components/Header';
import LocationTracker from '../components/LocationTracker';
import Toast from '../components/Toast';
import { Colors } from '../constants/theme';
import { useUser } from '../hooks/api/useAuthQueries';
import { useRouteGuard } from '../hooks/useRouteGuard';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

function AppContent() {
  const colorScheme = useColorScheme() ?? 'light';
  // Use useUser to fetch/validate user session on app start
  const { data: qUser, isLoading: isUserLoading } = useUser();
  const { user, setLoading } = useAuthStore();

  useEffect(() => {
    // When useUser settles, we can stop the global loading state
    if (!isUserLoading) {
      setLoading(false);
    }
  }, [isUserLoading, setLoading]);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
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
  }, []);

  useRouteGuard();


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

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
