import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import OnboardingStep from '../components/OnboardingStep';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

export default function TasksScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const router = useRouter();
    const { user, checkAuth, isLoading } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await checkAuth();
        setRefreshing(false);
    };

    const handleStepPress = (stepId: string) => {
        if (user?.role === 'client') {
            switch (stepId) {
                case 'route':
                    router.push('/(client)/add-route');
                    break;
                case 'places':
                    router.push('/(client)/places');
                    break;
                default:
                    break;
            }
        } else if (user?.role === 'driver') {
            switch (stepId) {
                case 'documents':
                    router.push('/(driver)/verification');
                    break;
                case 'car':
                    router.push('/(driver)/add-car');
                    break;
                case 'route':
                    router.push('/(driver)/add-route');
                    break;
                case 'approval':
                    break;
                default:
                    break;
            }
        }
    };

    const completedCount = user?.onboardingStatus?.steps.filter(s => s.status === 'completed').length || 0;
    const totalCount = user?.onboardingStatus?.steps.length || 0;
    const progress = totalCount > 0 ? completedCount / totalCount : 0;

    if (isLoading && !user) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
            >
                <View style={[styles.header, { marginTop: 10 }]}>
                    <Text style={[styles.title, { color: theme.text }]}>Finish Setup</Text>
                    <Text style={[styles.subtitle, { color: '#6B7280' }]}>
                        Complete the following tasks to unlock the full experience of Detour.
                    </Text>
                </View>


                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={[styles.progressLabel, { color: theme.text }]}>Your Progress</Text>
                        <Text style={[styles.progressLabel, { color: theme.text }]}>{Math.round(progress * 100)}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progress * 100}%`, backgroundColor: theme.primary }
                            ]}
                        />
                    </View>
                </View>

                {/* Steps List */}
                <View style={styles.stepsContainer}>
                    {user?.onboardingStatus?.steps.map((step) => (
                        <OnboardingStep
                            key={step.id}
                            step={step}
                            onPress={() => handleStepPress(step.id)}
                        />
                    ))}
                </View>

                {user?.onboardingStatus?.completed && (
                    <View style={styles.completedContainer}>
                        <View style={styles.checkIconContainer}>
                            <Ionicons name="checkmark" size={32} color="#16A34A" />
                        </View>
                        <Text style={[styles.completedTitle, { color: theme.text }]}>All Set!</Text>
                        <Text style={styles.completedSubtitle}>
                            You have completed all required tasks.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.replace('/')}
                            style={[styles.continueButton, { backgroundColor: theme.primary }]}
                        >
                            <Text style={styles.continueButtonText}>Continue to Home</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 32,
        marginTop: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    progressContainer: {
        marginBottom: 32,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    stepsContainer: {
        marginBottom: 24,
    },
    completedContainer: {
        marginTop: 32,
        alignItems: 'center',
    },
    checkIconContainer: {
        width: 64,
        height: 64,
        backgroundColor: '#DCFCE7',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    completedTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    completedSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 24,
        textAlign: 'center',
    },
    continueButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    continueButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
});
