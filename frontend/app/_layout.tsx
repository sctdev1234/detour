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

// if (Platform.OS === 'web') {
//   require('leaflet/dist/leaflet.css');
// }

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

import SocketService from '../services/socket';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
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
    if (user) {
      console.log('[Layout] Connecting socket for user:', user.id);
      SocketService.connect();
      SocketService.joinUserRoom(user.id);

      const handleNotification = (data: any) => {
        console.log('Received notification socket event:', data);

        // Show in-app toast on ALL platforms
        const { useUIStore } = require('../store/useUIStore');
        const uiStore = useUIStore.getState();
        uiStore.showToast(data.body || 'New message received', 'info');

        // Set unread badge for profile tab if it's a reclamation update
        if (data.reclamationId) {
          uiStore.setUnreadReclamation({ reclamationId: data.reclamationId });
        }

        // Additionally show system notification on native
        if (Platform.OS !== 'web') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: data.title,
              body: data.body,
              data: { reclamationId: data.reclamationId },
            },
            trigger: null,
          });
        }

        // Invalidate reclamation queries to refresh unread badges
        queryClient.invalidateQueries({ queryKey: ['reclamations'] });
      };

      const socket = SocketService.getSocket();
      socket?.on('notification', handleNotification);

      socket?.on('trip_updated', (data: any) => {
        console.log('Received trip_updated socket event:', data);
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['requests'] }); // Refresh join requests status too
      });

      socket?.on('trip_notification', (data: any) => {
        console.log('Received trip_notification socket event:', data);
        const { useUIStore } = require('../store/useUIStore');
        const uiStore = useUIStore.getState();
        uiStore.showToast(data.message || 'Trip updating!', 'info');
        queryClient.invalidateQueries({ queryKey: ['trips'] });
      });

      return () => {
        socket?.off('notification', handleNotification);
        socket?.off('trip_updated');
        socket?.off('trip_notification');
      };
    }
  }, [user]);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync();

    // Listen for notification interactions
    let notificationListener: Notifications.Subscription | undefined;

    if (Constants.appOwnership !== 'expo' || Platform.OS !== 'android') {
      notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.reclamationId) {
          router.push(`/reclamations/${data.reclamationId}`);
        } else if (data?.tripId) {
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
          <Stack.Screen name="modal" options={{ headerShown: false }} />
          <Stack.Screen name="finance/wallet" options={{ headerShown: false }} />
          <Stack.Screen name="reclamations/new" options={{ headerShown: false }} />
          <Stack.Screen name="reclamations/index" options={{ headerShown: false }} />
          <Stack.Screen name="reclamations/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
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
