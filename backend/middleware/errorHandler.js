const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Handle ZodError
    if (err.name === 'ZodError') {
        err.statusCode = 400;
        err.status = 'fail';
        err.message = err.errors.map(e => e.message).join(', ');
        err.isOperational = true;
    }

    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
        err.statusCode = 400;
        err.status = 'fail';
        const field = Object.keys(err.keyValue)[0];
        err.message = `${field} already exists`;
        err.isOperational = true;
    }

    // Log the error
    if (err.statusCode >= 500) {
        logger.error('💥 ERROR:', err);
    } else {
        logger.warn('⚠️ Warning:', err.message);
    }

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        // Production
        if (err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        } else {
            // Programming or other unknown error: don't leak error details
            res.status(500).json({
                status: 'error',
                message: 'Something went wrong!'
            });
        }
    }
};

module.exports = errorHandler;
