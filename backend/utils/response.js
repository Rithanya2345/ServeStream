/**
 * Standardized API Response Helpers
 * Every endpoint uses these to ensure a consistent JSON shape.
 */

/**
 * Success response
 * @param {import('express').Response} res
 * @param {*} data     Payload
 * @param {string} message  Human-readable message
 * @param {number} statusCode  HTTP status (default 200)
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

/**
 * Created response (201)
 */
const created = (res, data = null, message = 'Created successfully') => {
    return success(res, data, message, 201);
};

/**
 * Error response
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 * @param {*} errors   Validation errors or details
 */
const error = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
    const body = {
        success: false,
        message,
    };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
};

/**
 * Paginated list response
 */
const paginated = (res, data, total, page, limit, message = 'Success') => {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    });
};

module.exports = { success, created, error, paginated };
