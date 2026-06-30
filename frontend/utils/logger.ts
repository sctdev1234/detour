/**
 * Unified logging utility for the frontend application.
 * In development, it logs to the console.
 * In production, it can be extended to send logs to a service like Sentry or Datadog.
 */

const isProd = process.env.NODE_ENV === 'production';

export const logger = {
    info: (message: string, ...args: any[]) => {
        if (!isProd) {
            console.info(`[INFO] ${message}`, ...args);
        }
    },
    warn: (message: string, ...args: any[]) => {
        if (!isProd) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    error: (message: string, error?: any, ...args: any[]) => {
        if (!isProd) {
            console.error(`[ERROR] ${message}`, error, ...args);
        }
        // TODO: In production, send error to Sentry/Crashlytics
    },
    debug: (message: string, ...args: any[]) => {
        if (!isProd) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
};
