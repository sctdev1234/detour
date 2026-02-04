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
    showConfirm: (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
        confirmText?: string,
        cancelText?: string
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

    // Confirm Actions
    showConfirm: (title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel') => set({
        confirmTitle: title,
        confirmMessage: message,
        onConfirmConfig: onConfirm,
        onCancelConfig: onCancel || (() => { }),
        confirmText,
        cancelText,
        isConfirmVisible: true
    }),
    hideConfirm: () => set({ isConfirmVisible: false }),
}));
