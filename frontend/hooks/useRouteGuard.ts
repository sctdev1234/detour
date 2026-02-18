import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const useRouteGuard = () => {
    const { role, user, isLoading } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();
    const navigationState = useRootNavigationState();

    useEffect(() => {
        if (!navigationState?.key) return;
        if (isLoading) return;

        const segmentsArray = segments as string[];
        const inAuthGroup = segmentsArray[0] === '(auth)';
        const isLoginScreen = segmentsArray.length > 1 && segmentsArray[1] === 'login';
        const isSignupScreen = segmentsArray.length > 1 && segmentsArray[1] === 'signup';

        // List of routes that are accessible to authenticated users regardless of role
        const sharedRoutes = ['change-password', 'edit-profile', 'chat', 'modal', 'finance', 'reclamations'];

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
                'reclamations',
                '(client)/profile',
                '(driver)/profile',
                'edit-profile'
            ];

            const isWhitelisted = onboardingWhitelist.some(route => currentRoute.includes(route));

            if (!isCompleted) {
                // If not completed and not on a whitelisted page, force to tasks
                if (!isWhitelisted && !isTasksPage) {
                    // Prevent loop if already attempting to go there
                    router.replace('/tasks');
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
    }, [user, role, segments, isLoading, router, navigationState]);
};
