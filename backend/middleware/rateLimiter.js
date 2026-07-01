const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils/errors');

// General rate limiter for most auth routes (e.g. login)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window per IP
    handler: (req, res, next) => {
        next(new AppError('Too many authentication attempts. Please try again later.', 429));
    }
});

// Stricter rate limiter for OTP requests (e.g. send/resend OTP)
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour per IP
    handler: (req, res, next) => {
        next(new AppError('Too many OTP requests. Please try again in an hour.', 429));
    }
});

// Limiter for OTP verification to prevent brute forcing 6-digit codes
const otpVerifyLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Max 10 attempts to guess OTP
    handler: (req, res, next) => {
        next(new AppError('Too many failed verification attempts. Please request a new OTP.', 429));
    }
});

// General API limit for other auth endpoints (e.g. updating profile)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests
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
