import React from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useUIStore } from '../store/useUIStore';

export default function ConfirmationModal() {
    const {
        isConfirmVisible,
        confirmTitle,
        confirmMessage,
        onConfirmConfig,
        onCancelConfig,
        confirmText,
        cancelText,
        hideConfirm,
        validationText,
        confirmInput,
        setConfirmInput
    } = useUIStore();

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const handleConfirm = () => {
        onConfirmConfig();
        hideConfirm();
    };

    const handleCancel = () => {
        onCancelConfig();
        hideConfirm();
    };

    const isConfirmDisabled = validationText ? confirmInput !== validationText : false;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isConfirmVisible}
            onRequestClose={handleCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.bg, { backgroundColor: '#000', opacity: 0.5 }]} />
                <View style={[styles.modal, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.title, { color: theme.text }]}>{confirmTitle}</Text>
                    <Text style={[styles.message, { color: theme.icon }]}>{confirmMessage}</Text>

                    {validationText && (
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: theme.icon }]}>
                                Type <Text style={{ fontWeight: '700', color: theme.text }}>{validationText}</Text> to confirm
                            </Text>
                            <TextInput
                                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                                placeholder={validationText}
                                placeholderTextColor={theme.icon}
                                value={confirmInput}
                                onChangeText={setConfirmInput}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
                            onPress={handleCancel}
                        >
                            <Text style={[styles.buttonText, { color: theme.text }]}>{cancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.confirmButton,
                                { backgroundColor: isConfirmDisabled ? theme.border : theme.primary },
                                { opacity: isConfirmDisabled ? 0.5 : 1 }
                            ]}
                            disabled={isConfirmDisabled}
                            onPress={handleConfirm}
                        >
                            <Text style={[styles.buttonText, { color: '#fff', fontWeight: '700' }]}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    bg: {
        ...StyleSheet.absoluteFillObject,
    },
    modal: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 32,
        padding: 28,
        boxShadow: '0px 12px 32px rgba(0,0,0,0.25)',
        elevation: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 24,
        fontWeight: '500',
        opacity: 0.9,
    },
    actions: {
        flexDirection: 'column-reverse', // Stack buttons on mobile
        gap: 12,
        width: '100%',
    },
    button: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    confirmButton: {
        elevation: 4,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 28,
        gap: 12,
    },
    label: {
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '600',
    },
    input: {
        height: 56,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 20,
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
    }
});

