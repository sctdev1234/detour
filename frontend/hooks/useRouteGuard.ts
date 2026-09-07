import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const useRouteGuard = () => {
    const { user, isLoading } = useAuthStore();
    const role = user?.role;
    const segments = useSegments();
    const router = useRouter();
    const navigationState = useRootNavigationState();

    useEffect(() => {
        if (!navigationState?.key) return;
        if (isLoading) return;

        const timeoutId = setTimeout(() => {
            const segmentsArray = segments as string[];
            const inAuthGroup = segmentsArray[0] === '(auth)';
            const isLoginScreen = segmentsArray.length > 1 && segmentsArray[1] === 'login';
            const isSignupScreen = segmentsArray.length > 1 && segmentsArray[1] === 'signup';

            // List of routes that are accessible to authenticated users regardless of role
            const sharedRoutes = ['change-password', 'edit-profile', 'profile', 'chat', 'modal', 'finance', 'reclamations', 'active-trip', 'notifications'];

            const safeReplace = (path: string) => {
                try {
                    router.replace(path as any);
                } catch (e) {
                    console.warn('[RouteGuard] Navigation deferred:', e);
                }
            };

            if (!user) {
                const isWelcomeScreen = segmentsArray.length > 1 && segmentsArray[1] === 'welcome';
                if (!inAuthGroup || (!isLoginScreen && !isSignupScreen && !isWelcomeScreen)) {
                    safeReplace('/(auth)/welcome');
                }
            } else if (!role) {
                if (segmentsArray.length > 1 && segmentsArray[1] !== 'role-selection') {
                    safeReplace('/(auth)/role-selection');
                }
            } else {
            // If user has a role, check onboarding status
            const onboardingStatus = user.onboardingStatus;
            const isCompleted = onboardingStatus?.completed;

            const currentRoute = segmentsArray.join('/');
            const isTasksPage = segmentsArray.includes('tasks');

            // Define currentGroup for role checking
            const currentGroup = segmentsArray[0];

            // Role-specific whitelists of routes allowed during onboarding
            const sharedWhitelist = [
                'tasks',
                'modal',
                'chat',
                'reclamations',
                'edit-profile',
                'profile',
                'notifications'
            ];

            const clientWhitelist = [
                '(client)/add-route',
                '(client)/places',
                '(client)/profile'
            ];

            const driverWhitelist = [
                '(driver)/verification',
                '(driver)/add-car',
                '(driver)/profile'
            ];

            let activeWhitelist = [...sharedWhitelist];
            if (role === 'client') {
                activeWhitelist = activeWhitelist.concat(clientWhitelist);
            } else if (role === 'driver') {
                activeWhitelist = activeWhitelist.concat(driverWhitelist);
            }

            const isWhitelisted = activeWhitelist.some(route => currentRoute.includes(route));

            if (!isCompleted) {
                // If not completed and not on a whitelisted page, force to tasks
                if (!isWhitelisted && !isTasksPage) {
                    // Prevent loop if already attempting to go there
                    safeReplace('/tasks');
                }
            } else {
                // Onboarding completed
                // Special rule for Driver: If route missing, go to add-route
                if (role === 'driver') {
                    const hasRoute = onboardingStatus?.steps.find(s => s.id === 'route')?.status === 'completed';
                    // Only redirect if we are on the 'root' or dashboard, to avoid interfering with other navigation
                    if (!hasRoute && (currentRoute === '(driver)' || currentRoute === '(driver)/index')) {
                        safeReplace('/(driver)/add-route');
                    } else if (currentGroup !== '(driver)' && !sharedRoutes.includes(currentGroup)) {
                        safeReplace('/(driver)');
                    }
                } else if (role === 'client') {
                    if (currentGroup !== '(client)' && !sharedRoutes.includes(currentGroup)) {
                        safeReplace('/(client)');
                    }
                }
            }
        }
        }, 50);

        return () => clearTimeout(timeoutId);
    }, [user, role, segments, isLoading, router, navigationState]);
};
