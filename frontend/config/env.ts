import { z } from 'zod';
import Constants from 'expo-constants';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().optional(),
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  // Add other required public env vars here
});

// Extract environment variables
const processEnv = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
};

// Validate environment variables
const parsedEnv = envSchema.safeParse(processEnv);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data;

// Utility for dynamic IP resolution (Development)
export const getApiUrl = () => {
  if (env.EXPO_PUBLIC_API_URL) {
    return `${env.EXPO_PUBLIC_API_URL}/api`;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return 'http://localhost:5000/api';

  const ip = hostUri.split(':')[0];
  return `http://${ip}:5000/api`;
};

export const getBaseUrl = () => {
  return env.EXPO_PUBLIC_API_URL || getApiUrl().replace('/api', '');
};
