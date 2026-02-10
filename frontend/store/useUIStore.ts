import { create } from 'zustand';

interface ToastSlice {
    toastMessage: string;
    toastType: 'success' | 'error' | 'info' | 'warning';
    isToastVisible: boolean;
    showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    hideToast: () => void;
}

export interface ConfirmOptions {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    validationText?: string;
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
    showConfirm: (options: ConfirmOptions) => void;
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
    showConfirm: (options) => set({
        confirmTitle: options.title,
        confirmMessage: options.message,
        onConfirmConfig: options.onConfirm,
        onCancelConfig: options.onCancel || (() => { }),
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        validationText: options.validationText,
        confirmInput: '', // Reset input on show
        isConfirmVisible: true
    }),
    hideConfirm: () => set({ isConfirmVisible: false }),
}));
