const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils/errors');

const isDev = process.env.NODE_ENV !== 'production';

// General rate limiter for most auth routes (e.g. login)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 1000 : 5, // 1000 attempts in dev, 5 in prod
    handler: (req, res, next) => {
        next(new AppError('Too many authentication attempts. Please try again later.', 429));
    }
});

// Stricter rate limiter for OTP requests (e.g. send/resend OTP)
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDev ? 1000 : 3, // 1000 requests in dev, 3 in prod
    handler: (req, res, next) => {
        next(new AppError('Too many OTP requests. Please try again in an hour.', 429));
    }
});

// Limiter for OTP verification to prevent brute forcing 6-digit codes
const otpVerifyLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: isDev ? 1000 : 10, // 1000 attempts in dev, 10 in prod
    handler: (req, res, next) => {
        next(new AppError('Too many failed verification attempts. Please request a new OTP.', 429));
    }
});

// General API limit for other auth endpoints (e.g. updating profile)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 10000 : 100, // 10000 requests in dev, 100 in prod
    handler: (req, res, next) => {
        next(new AppError('Too many requests. Please slow down.', 429));
    }
});

module.exports = {
    authLimiter,
    otpLimiter,
    otpVerifyLimiter,
    apiLimiter
};
