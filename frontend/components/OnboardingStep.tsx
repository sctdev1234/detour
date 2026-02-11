import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';

interface OnboardingStepProps {
    step: {
        id: string;
        label: string;
        status: 'pending' | 'in-progress' | 'completed';
        required: boolean;
    };
    onPress: () => void;
    disabled?: boolean;
}

const OnboardingStep: React.FC<OnboardingStepProps> = ({ step, onPress, disabled }) => {
    const isCompleted = step.status === 'completed';
    const isInProgress = step.status === 'in-progress';

    // Dynamic background and border colors
    const getBackgroundColor = () => {
        if (isCompleted) return '#F0FDF4'; // green-50
        if (isInProgress) return '#EFF6FF'; // blue-50
        return '#FFFFFF';
    };

    const getBorderColor = () => {
        if (isCompleted) return '#BBF7D0'; // green-200
        if (isInProgress) return '#BFDBFE'; // blue-200
        return '#E5E7EB'; // gray-200
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || isCompleted}
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    opacity: disabled ? 0.6 : 1,
                }
            ]}
        >
            <View style={styles.leftContent}>
                <View
                    style={[
                        styles.iconContainer,
                        {
                            backgroundColor: isCompleted ? '#DCFCE7' : isInProgress ? '#DBEAFE' : '#F3F4F6'
                        }
                    ]}
                >
                    <Ionicons
                        name={isCompleted ? 'checkmark' : isInProgress ? 'time' : 'ellipse-outline'}
                        size={24}
                        color={
                            isCompleted
                                ? '#16A34A' // green-600
                                : isInProgress
                                    ? Colors.light.primary
                                    : '#9CA3AF' // gray-400
                        }
                    />
                </View>
                <View style={styles.textContent}>
                    <Text
                        style={[
                            styles.label,
                            { color: isCompleted ? '#166534' : '#111827' }
                        ]}
                    >
                        {step.label}
                    </Text>
                    <Text style={styles.subtext}>
                        {isCompleted
                            ? 'Completed'
                            : isInProgress
                                ? 'In Progress'
                                : step.required
                                    ? 'Required'
                                    : 'Optional'}
                    </Text>
                </View>
            </View>

            {!isCompleted && !disabled && (
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContent: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    subtext: {
        fontSize: 14,
        color: '#6B7280', // gray-500
    },
});

export default OnboardingStep;
