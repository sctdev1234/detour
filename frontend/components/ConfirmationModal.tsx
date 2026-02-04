import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
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
        hideConfirm
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

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
                            onPress={handleCancel}
                        >
                            <Text style={[styles.buttonText, { color: theme.text }]}>{cancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton, { backgroundColor: theme.primary }]}
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
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    confirmButton: {

    },
    buttonText: {
        fontSize: 16,
    }
});
