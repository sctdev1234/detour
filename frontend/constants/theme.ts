import { Platform } from 'react-native';

const tintColorLight = '#0066FF';
const tintColorDark = '#0A84FF';

export const Colors = {
  light: {
    text: '#1C1C1E',
    textSecondary: '#6C6C70',
    background: '#F2F2F7',
    backgroundSecondary: '#FFFFFF',
    tint: tintColorLight,
    icon: '#8E8E93',
    tabIconDefault: '#AEAEB2',
    tabIconSelected: tintColorLight,
    primary: '#007AFF',
    secondary: '#5856D6',
    accent: '#FF2D55',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    surface: '#FFFFFF',
    surfaceHighlight: '#E5E5EA',
    border: '#C6C6C8',
    skeleton: '#E1E9EE',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    tint: tintColorDark,
    icon: '#8E8E93',
    tabIconDefault: '#636366',
    tabIconSelected: tintColorDark,
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    accent: '#FF375F',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#64D2FF',
    surface: '#1C1C1E',
    surfaceHighlight: '#2C2C2E',
    border: '#38383A',
    skeleton: '#2C2C2E',
  },
};

export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  s: 4,
  m: 8,
  l: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const Shadows = Platform.select({
  ios: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    },
  },
  android: {
    small: {
      elevation: 2,
    },
    medium: {
      elevation: 4,
    },
    large: {
      elevation: 8,
    },
  },
  web: {
    small: {
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    medium: {
      boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
    },
    large: {
      boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
    },
  },
});

export const Typography = {
  h1: { fontSize: 32, fontWeight: '700' },
  h2: { fontSize: 24, fontWeight: '700' },
  h3: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
  button: { fontSize: 16, fontWeight: '600' },
};
