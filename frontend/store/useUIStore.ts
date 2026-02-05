import { create } from 'zustand';

interface ToastSlice {
    toastMessage: string;
    toastType: 'success' | 'error' | 'info' | 'warning';
    isToastVisible: boolean;
    showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    hideToast: () => void;
}

interface ConfirmSlice {
    confirmTitle: string;
    confirmMessage: string;
    isConfirmVisible: boolean;
    onConfirmConfig: () => void;
    onCancelConfig: () => void;
    confirmText: string;
    cancelText: string;
    // New fields for input confirmation
    validationText?: string; // The text user must type to confirm (e.g. email)
    confirmInput: string;
    setConfirmInput: (text: string) => void;
    showConfirm: (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
        confirmText?: string,
        confirmText?: string,
        cancelText?: string,
        validationText?: string
    ) => void;
    hideConfirm: () => void;
}

export const useUIStore = create<ToastSlice & ConfirmSlice>((set) => ({
    // Toast Initial State
    toastMessage: '',
    toastType: 'info',
    isToastVisible: false,

    // Toast Actions
    showToast: (message, type = 'info') => set({
        toastMessage: message,
        toastType: type,
        isToastVisible: true
    }),
    hideToast: () => set({ isToastVisible: false }),

    // Confirm Initial State
    confirmTitle: '',
    confirmMessage: '',
    isConfirmVisible: false,
    onConfirmConfig: () => { },
    onCancelConfig: () => { },
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    validationText: undefined,
    confirmInput: '',
    setConfirmInput: (text) => set({ confirmInput: text }),

    // Confirm Actions
    showConfirm: (title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', validationText) => set({
        confirmTitle: title,
        confirmMessage: message,
        onConfirmConfig: onConfirm,
        onCancelConfig: onCancel || (() => { }),
        confirmText,
        cancelText,
        validationText,
        confirmInput: '', // Reset input on show
        isConfirmVisible: true
    }),
    hideConfirm: () => set({ isConfirmVisible: false }),
}));
