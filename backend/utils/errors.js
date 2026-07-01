/**
 * ---------------------------------------------------------------------------------
 * CLASS: AppError
 * ---------------------------------------------------------------------------------
 * Purpose: Structured error format for all domain errors.
 *          Forces correlationId, errorCode, domain, operation, timestamp.
 * ---------------------------------------------------------------------------------
 */

const context = require('./context');

class AppError extends Error {
    constructor({ message, errorCode, domain, operation, statusCode = 500, isOperational = true }) {
        super(message);
        this.name = this.constructor.name;
        
        // Custom Fields
        this.errorCode = errorCode;
        this.domain = domain;
        this.operation = operation;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.correlationId = context.get('correlationId') || 'SYSTEM';
        this.timestamp = new Date().toISOString();
        
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: {
                message: this.message,
                errorCode: this.errorCode,
                domain: this.domain,
                operation: this.operation,
                correlationId: this.correlationId,
                timestamp: this.timestamp
            }
        };
    }
}

class ValidationError extends AppError {
    constructor({ message, domain, operation }) {
        super({
            message,
            errorCode: 'VALIDATION_FAILED',
            domain,
            operation,
            statusCode: 400
        });
    }
}

class ResourceNotFoundError extends AppError {
    constructor({ message, domain, operation }) {
        super({
            message,
            errorCode: 'RESOURCE_NOT_FOUND',
            domain,
            operation,
            statusCode: 404
        });
    }
}

class ConflictError extends AppError {
    constructor({ message, domain, operation }) {
        super({
            message,
            errorCode: 'CONFLICT',
            domain,
            operation,
            statusCode: 409
        });
    }
}

module.exports = {
    AppError,
    ValidationError,
    ResourceNotFoundError,
    ConflictError
};
