/**
 * Global Error Handler
 * Catches all errors thrown in routes/controllers/services and returns
 * a consistent JSON error response.
 */
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    // Default to 500 Internal Server Error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';

    // PostgreSQL unique violation → 409 Conflict
    if (err.code === '23505') {
        statusCode = 409;
        message = 'A record with this value already exists';
    }

    // PostgreSQL foreign key violation → 400 Bad Request
    if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced record does not exist';
    }

    // PostgreSQL check constraint violation → 400 Bad Request
    if (err.code === '23514') {
        statusCode = 400;
        message = 'Data validation failed at database level';
    }

    // Joi validation error
    if (err.isJoi) {
        statusCode = 400;
        message = err.details?.map((d) => d.message).join('; ') || 'Validation error';
    }

    // Log server errors in development
    if (statusCode >= 500) {
        console.error(`[ERROR ${statusCode}] ${req.method} ${req.originalUrl}:`, err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        // Include stack trace only in development
        ...(env.isDevelopment() && { stack: err.stack }),
    });
};

module.exports = errorHandler;
